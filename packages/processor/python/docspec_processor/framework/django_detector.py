"""Detect Django framework usage and extract models, views, serializers.

Targets:
  - ``django.db.models.Model`` subclasses
  - ``django.views.View`` / ``rest_framework.viewsets.ViewSet``
  - ``rest_framework.serializers.Serializer``
  - ``django.urls.path`` / ``re_path`` for URL patterns
"""
# @docspec:module {
#   id: "docspec-py-django-detector",
#   name: "Django Framework Detector",
#   description: "Detects Django/DRF presence and extracts models (fields, Meta, relations), views (HTTP methods, permissions), serializers, and URL patterns from Python source.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
from pathlib import Path
from typing import Any


# Base classes that indicate Django components
_DJANGO_MODEL_BASES: set[str] = {
    "Model", "models.Model",
}

_DJANGO_VIEW_BASES: set[str] = {
    "View", "TemplateView", "ListView", "DetailView", "CreateView",
    "UpdateView", "DeleteView", "FormView", "RedirectView",
    "APIView", "ViewSet", "ModelViewSet", "GenericAPIView",
    "ReadOnlyModelViewSet", "GenericViewSet",
}

_DJANGO_SERIALIZER_BASES: set[str] = {
    "Serializer", "ModelSerializer", "HyperlinkedModelSerializer",
    "ListSerializer",
}


# @docspec:boundary "Django/DRF framework detection and structural metadata extraction"
class DjangoDetector:
    """Detect Django framework presence and extract structural metadata."""

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Scan source directory to detect Django framework presence via import analysis"
    def detect(self, source_dir: str) -> bool:
        """Return ``True`` if any source file imports from ``django``."""
        for py_file in Path(source_dir).rglob("*.py"):
            try:
                content = py_file.read_text(encoding="utf-8", errors="replace")
                if "from django" in content or "import django" in content:
                    return True
                if "from rest_framework" in content or "import rest_framework" in content:
                    return True
            except OSError:
                continue
        return False

    # @docspec:method { since: "3.0.0" }
    # @docspec:intentional "Extract Django models, views, serializers, and URL patterns from source"
    def extract(self, source_dir: str) -> dict[str, Any]:
        """Extract Django models, views, and serializers.

        Returns a dict with keys ``models``, ``views``, ``serializers``,
        ``urlPatterns``, each being a list of dicts.
        """
        result: dict[str, Any] = {
            "models": [],
            "views": [],
            "serializers": [],
            "urlPatterns": [],
        }

        for py_file in Path(source_dir).rglob("*.py"):
            try:
                content = py_file.read_text(encoding="utf-8", errors="replace")
                tree = ast.parse(content)
            except (OSError, SyntaxError):
                continue

            rel_path = py_file.relative_to(source_dir)
            module = ".".join(rel_path.with_suffix("").parts)

            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    category = self._classify_class(node)
                    if category == "model":
                        result["models"].append(self._extract_model(node, module))
                    elif category == "view":
                        result["views"].append(self._extract_view(node, module))
                    elif category == "serializer":
                        result["serializers"].append(self._extract_serializer(node, module))

                # Detect URL patterns
                if isinstance(node, ast.Call):
                    url_pattern = self._extract_url_pattern(node)
                    if url_pattern:
                        result["urlPatterns"].append(url_pattern)

        return result

    # ------------------------------------------------------------------
    # Class classification
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _classify_class(node: ast.ClassDef) -> str | None:
        """Return 'model', 'view', 'serializer', or None."""
        for base in node.bases:
            base_name = ""
            if isinstance(base, ast.Name):
                base_name = base.id
            elif isinstance(base, ast.Attribute):
                if isinstance(base.value, ast.Name):
                    base_name = f"{base.value.id}.{base.attr}"
                else:
                    base_name = base.attr

            if base_name in _DJANGO_MODEL_BASES:
                return "model"
            if base_name in _DJANGO_VIEW_BASES:
                return "view"
            if base_name in _DJANGO_SERIALIZER_BASES:
                return "serializer"
        return None

    # ------------------------------------------------------------------
    # Model extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Extract Django model metadata including fields, Meta options, and docstring"
    def _extract_model(self, node: ast.ClassDef, module: str) -> dict[str, Any]:
        fields: list[dict[str, Any]] = []
        meta: dict[str, Any] = {}

        for stmt in node.body:
            # Field assignments: name = models.CharField(...)
            if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
                target = stmt.targets[0]
                if isinstance(target, ast.Name) and isinstance(stmt.value, ast.Call):
                    field = self._extract_model_field(target.id, stmt.value)
                    if field:
                        fields.append(field)

            # Annotated assignments
            if isinstance(stmt, ast.AnnAssign) and isinstance(stmt.target, ast.Name):
                fields.append({
                    "name": stmt.target.id,
                    "type": ast.unparse(stmt.annotation) if stmt.annotation else "Any",
                })

            # Meta class
            if isinstance(stmt, ast.ClassDef) and stmt.name == "Meta":
                meta = self._extract_meta(stmt)

        result: dict[str, Any] = {
            "name": node.name,
            "qualified": f"{module}.{node.name}",
            "fields": fields,
        }
        if meta:
            result["meta"] = meta

        docstring = ast.get_docstring(node)
        if docstring:
            result["description"] = docstring.split("\n")[0].strip()

        return result

    # @docspec:deterministic
    @staticmethod
    def _extract_model_field(name: str, call: ast.Call) -> dict[str, Any] | None:
        """Extract a Django model field from ``name = models.CharField(...)``."""
        func = call.func
        field_type: str | None = None

        if isinstance(func, ast.Attribute):
            field_type = func.attr
        elif isinstance(func, ast.Name):
            field_type = func.id

        if field_type is None:
            return None

        # Only treat it as a model field if it looks like a Django field type
        if not field_type.endswith("Field") and field_type not in (
            "ForeignKey", "OneToOneField", "ManyToManyField",
        ):
            return None

        field: dict[str, Any] = {"name": name, "type": field_type}

        # Extract common kwargs
        for kw in call.keywords:
            if kw.arg and isinstance(kw.value, ast.Constant):
                if kw.arg == "max_length":
                    field["maxLength"] = kw.value.value
                elif kw.arg == "null":
                    field["nullable"] = kw.value.value
                elif kw.arg == "blank":
                    field["blank"] = kw.value.value
                elif kw.arg == "unique":
                    field["unique"] = kw.value.value
                elif kw.arg == "default":
                    field["default"] = str(kw.value.value)
                elif kw.arg == "help_text":
                    field["description"] = kw.value.value
                elif kw.arg == "verbose_name":
                    field["label"] = kw.value.value

        # For ForeignKey, extract the related model
        if field_type in ("ForeignKey", "OneToOneField", "ManyToManyField"):
            if call.args:
                first = call.args[0]
                if isinstance(first, ast.Constant) and isinstance(first.value, str):
                    field["relatedModel"] = first.value
                elif isinstance(first, ast.Name):
                    field["relatedModel"] = first.id

        return field

    # @docspec:deterministic
    @staticmethod
    def _extract_meta(meta_class: ast.ClassDef) -> dict[str, Any]:
        """Extract Django model Meta options."""
        meta: dict[str, Any] = {}
        for stmt in meta_class.body:
            if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
                target = stmt.targets[0]
                if isinstance(target, ast.Name):
                    if isinstance(stmt.value, ast.Constant):
                        meta[target.id] = stmt.value.value
                    elif isinstance(stmt.value, (ast.List, ast.Tuple)):
                        meta[target.id] = [
                            elt.value for elt in stmt.value.elts
                            if isinstance(elt, ast.Constant)
                        ]
        return meta

    # ------------------------------------------------------------------
    # View extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Extract Django view metadata including HTTP methods, permissions, and docstring"
    def _extract_view(self, node: ast.ClassDef, module: str) -> dict[str, Any]:
        methods: list[str] = []
        for stmt in node.body:
            if isinstance(stmt, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if stmt.name in ("get", "post", "put", "patch", "delete", "list", "create",
                                 "retrieve", "update", "partial_update", "destroy"):
                    methods.append(stmt.name)

        view: dict[str, Any] = {
            "name": node.name,
            "qualified": f"{module}.{node.name}",
            "httpMethods": methods,
        }

        docstring = ast.get_docstring(node)
        if docstring:
            view["description"] = docstring.split("\n")[0].strip()

        # Extract permission_classes
        for stmt in node.body:
            if isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name) and target.id == "permission_classes":
                        if isinstance(stmt.value, (ast.List, ast.Tuple)):
                            view["permissions"] = [
                                ast.unparse(elt) for elt in stmt.value.elts
                            ]

        return view

    # ------------------------------------------------------------------
    # Serializer extraction
    # ------------------------------------------------------------------

    # @docspec:intentional "Extract DRF serializer metadata including field types, Meta model, and docstring"
    def _extract_serializer(self, node: ast.ClassDef, module: str) -> dict[str, Any]:
        serializer: dict[str, Any] = {
            "name": node.name,
            "qualified": f"{module}.{node.name}",
            "fields": [],
        }

        for stmt in node.body:
            if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1:
                target = stmt.targets[0]
                if isinstance(target, ast.Name) and isinstance(stmt.value, ast.Call):
                    func = stmt.value.func
                    field_type: str | None = None
                    if isinstance(func, ast.Attribute):
                        field_type = func.attr
                    elif isinstance(func, ast.Name):
                        field_type = func.id
                    if field_type and field_type.endswith("Field"):
                        serializer["fields"].append({
                            "name": target.id,
                            "type": field_type,
                        })

            # Meta class for ModelSerializer
            if isinstance(stmt, ast.ClassDef) and stmt.name == "Meta":
                meta = self._extract_meta(stmt)
                if "model" in meta:
                    serializer["model"] = meta["model"]
                if "fields" in meta:
                    serializer["metaFields"] = meta["fields"]

        docstring = ast.get_docstring(node)
        if docstring:
            serializer["description"] = docstring.split("\n")[0].strip()

        return serializer

    # ------------------------------------------------------------------
    # URL pattern extraction
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _extract_url_pattern(node: ast.Call) -> dict[str, Any] | None:
        """Extract ``path("api/users/", UserView.as_view())`` patterns."""
        func = node.func
        func_name: str | None = None
        if isinstance(func, ast.Name):
            func_name = func.id
        elif isinstance(func, ast.Attribute):
            func_name = func.attr

        if func_name not in ("path", "re_path", "url"):
            return None

        if not node.args:
            return None

        first = node.args[0]
        if not isinstance(first, ast.Constant) or not isinstance(first.value, str):
            return None

        pattern: dict[str, Any] = {"pattern": first.value}

        # Try to get the view reference
        if len(node.args) > 1:
            view_arg = node.args[1]
            if isinstance(view_arg, ast.Call) and isinstance(view_arg.func, ast.Attribute):
                if isinstance(view_arg.func.value, ast.Name):
                    pattern["view"] = view_arg.func.value.id
            elif isinstance(view_arg, ast.Name):
                pattern["view"] = view_arg.id

        # Extract name= keyword
        for kw in node.keywords:
            if kw.arg == "name" and isinstance(kw.value, ast.Constant):
                pattern["name"] = kw.value.value

        return pattern
