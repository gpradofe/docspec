"""Detect data store patterns in Python projects.

Targets:
  - SQLAlchemy: ``declarative_base()``, ``Column``, ``relationship``
  - Django ORM: ``models.Model`` subclasses, ``models.*Field``
  - Redis: ``redis.Redis``, ``aioredis``
  - MongoDB: ``pymongo``, ``motor``, ``mongoengine``
  - Celery (message broker): ``celery.Celery``
"""
# @docspec:module {
#   id: "docspec-py-datastore-extractor",
#   name: "Data Store Extractor",
#   description: "Detects data store usage (SQLAlchemy, Django ORM, Redis, MongoDB, Kafka, RabbitMQ, Elasticsearch) and extracts table names, topic names, and store metadata.",
#   since: "3.0.0"
# }
from __future__ import annotations

import ast
from typing import Any

from docspec_processor.extractor.extractor_interface import DocSpecExtractor, ExtractionContext

# Import patterns that signal data store frameworks
_DATASTORE_IMPORTS: dict[str, str] = {
    "sqlalchemy": "rdbms",
    "django.db": "rdbms",
    "tortoise": "rdbms",
    "peewee": "rdbms",
    "redis": "cache",
    "aioredis": "cache",
    "pymongo": "document-store",
    "motor": "document-store",
    "mongoengine": "document-store",
    "celery": "message-broker",
    "pika": "message-broker",
    "aio_pika": "message-broker",
    "kafka": "message-broker",
    "aiokafka": "message-broker",
    "elasticsearch": "search-engine",
    "opensearchpy": "search-engine",
}


# @docspec:boundary "Data store detection and metadata extraction from Python source"
class DataStoreExtractor(DocSpecExtractor):
    """Extracts data store metadata from source code."""

    # @docspec:deterministic
    def extractor_name(self) -> str:
        return "data-store"

    # @docspec:intentional "Check if any data store framework imports are present in the source"
    def is_available(self, context: ExtractionContext) -> bool:
        for item in context.sources:
            source: str = item["source"]
            for imp in _DATASTORE_IMPORTS:
                if imp in source:
                    return True
        return False

    # @docspec:intentional "Detect data store patterns and extract table names, topic names, and store metadata"
    def extract(self, context: ExtractionContext) -> None:
        stores: dict[str, dict[str, Any]] = {}  # id -> store dict

        for item in context.sources:
            try:
                tree = ast.parse(item["source"])
            except SyntaxError:
                continue
            prefix = item["qualified_prefix"]

            detected_imports = self._detect_imports(tree)

            for imp_key, store_type in detected_imports.items():
                store_id = self._store_id(imp_key, store_type)
                store_name = self._store_name(imp_key, store_type)
                store = stores.setdefault(store_id, {
                    "id": store_id,
                    "name": store_name,
                    "type": store_type,
                    "tables": [],
                    "topics": [],
                })

                # Extract table/model names for RDBMS
                if store_type == "rdbms":
                    tables = self._extract_tables(tree, imp_key, prefix)
                    for t in tables:
                        if t not in store["tables"]:
                            store["tables"].append(t)

                # Extract topic names for message brokers
                if store_type == "message-broker":
                    topics = self._extract_topics(tree)
                    for t in topics:
                        if not any(existing["name"] == t for existing in store["topics"]):
                            store["topics"].append({"name": t})

        if not stores:
            return

        existing: list[dict] = context.model.setdefault("dataStores", [])
        for store_id, store_data in stores.items():
            # Merge with existing if already present
            found = False
            for ex in existing:
                if ex.get("id") == store_id:
                    for t in store_data.get("tables", []):
                        if t not in ex.setdefault("tables", []):
                            ex["tables"].append(t)
                    for t in store_data.get("topics", []):
                        if not any(et["name"] == t["name"] for et in ex.setdefault("topics", [])):
                            ex["topics"].append(t)
                    found = True
                    break
            if not found:
                # Remove empty lists
                cleaned: dict[str, Any] = {k: v for k, v in store_data.items() if v}
                existing.append(cleaned)

    # ------------------------------------------------------------------
    # Import detection
    # ------------------------------------------------------------------

    # @docspec:deterministic
    def _detect_imports(self, tree: ast.Module) -> dict[str, str]:
        """Return mapping of import-key -> store-type for detected imports."""
        found: dict[str, str] = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    for key, store_type in _DATASTORE_IMPORTS.items():
                        if alias.name == key or alias.name.startswith(f"{key}."):
                            found[key] = store_type
            elif isinstance(node, ast.ImportFrom) and node.module:
                for key, store_type in _DATASTORE_IMPORTS.items():
                    if node.module == key or node.module.startswith(f"{key}."):
                        found[key] = store_type
        return found

    # ------------------------------------------------------------------
    # Table extraction (SQLAlchemy / Django)
    # ------------------------------------------------------------------

    # @docspec:intentional "Extract table names from ORM model class definitions"
    def _extract_tables(self, tree: ast.Module, imp_key: str, prefix: str) -> list[str]:
        """Extract table names from model class definitions."""
        tables: list[str] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.ClassDef):
                continue

            is_model = self._is_orm_model(node, imp_key)
            if not is_model:
                continue

            # Try to find __tablename__ assignment
            table_name = self._find_tablename(node)
            if table_name is None:
                # Derive from class name (convention: snake_case)
                table_name = self._class_to_table(node.name)

            tables.append(table_name)
        return tables

    # @docspec:deterministic
    @staticmethod
    def _is_orm_model(node: ast.ClassDef, imp_key: str) -> bool:
        """Check whether *node* extends a known ORM base class."""
        orm_bases = {
            "sqlalchemy": ("Base", "DeclarativeBase", "Model", "db.Model"),
            "django.db": ("Model", "models.Model"),
            "tortoise": ("Model",),
            "peewee": ("Model",),
        }
        expected = orm_bases.get(imp_key, ())
        for base in node.bases:
            name = ""
            if isinstance(base, ast.Name):
                name = base.id
            elif isinstance(base, ast.Attribute):
                if isinstance(base.value, ast.Name):
                    name = f"{base.value.id}.{base.attr}"
                else:
                    name = base.attr
            if name in expected:
                return True
        return False

    # @docspec:deterministic
    @staticmethod
    def _find_tablename(node: ast.ClassDef) -> str | None:
        """Find ``__tablename__ = "..."`` in a class body."""
        for stmt in node.body:
            if isinstance(stmt, ast.Assign):
                for target in stmt.targets:
                    if isinstance(target, ast.Name) and target.id == "__tablename__":
                        if isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str):
                            return stmt.value.value
        return None

    # @docspec:deterministic
    @staticmethod
    def _class_to_table(class_name: str) -> str:
        """Convert CamelCase class name to snake_case table name."""
        import re
        return re.sub(r"([a-z])([A-Z])", r"\1_\2", class_name).lower()

    # ------------------------------------------------------------------
    # Topic extraction (Kafka / message brokers)
    # ------------------------------------------------------------------

    # @docspec:intentional "Extract topic names from subscribe/publish call arguments"
    def _extract_topics(self, tree: ast.Module) -> list[str]:
        """Extract topic names from string constants in subscribe/publish calls."""
        topics: list[str] = []
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call):
                continue
            func_name = self._call_attr(node)
            if func_name in ("subscribe", "send", "produce", "publish", "consume"):
                for arg in node.args:
                    if isinstance(arg, ast.Constant) and isinstance(arg.value, str):
                        topics.append(arg.value)
                for kw in node.keywords:
                    if kw.arg == "topic" and isinstance(kw.value, ast.Constant) and isinstance(kw.value.value, str):
                        topics.append(kw.value.value)
        return topics

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    # @docspec:deterministic
    @staticmethod
    def _store_id(imp_key: str, store_type: str) -> str:
        mapping = {
            "sqlalchemy": "rdbms",
            "django.db": "rdbms",
            "tortoise": "rdbms",
            "peewee": "rdbms",
            "redis": "redis",
            "aioredis": "redis",
            "pymongo": "mongodb",
            "motor": "mongodb",
            "mongoengine": "mongodb",
            "celery": "celery",
            "pika": "rabbitmq",
            "aio_pika": "rabbitmq",
            "kafka": "kafka",
            "aiokafka": "kafka",
            "elasticsearch": "elasticsearch",
            "opensearchpy": "opensearch",
        }
        return mapping.get(imp_key, store_type)

    # @docspec:deterministic
    @staticmethod
    def _store_name(imp_key: str, store_type: str) -> str:
        mapping = {
            "sqlalchemy": "Primary Database",
            "django.db": "Primary Database",
            "tortoise": "Primary Database",
            "peewee": "Primary Database",
            "redis": "Redis",
            "aioredis": "Redis",
            "pymongo": "MongoDB",
            "motor": "MongoDB",
            "mongoengine": "MongoDB",
            "celery": "Celery Broker",
            "pika": "RabbitMQ",
            "aio_pika": "RabbitMQ",
            "kafka": "Kafka",
            "aiokafka": "Kafka",
            "elasticsearch": "Elasticsearch",
            "opensearchpy": "OpenSearch",
        }
        return mapping.get(imp_key, store_type.title())

    # @docspec:deterministic
    @staticmethod
    def _call_attr(node: ast.Call) -> str | None:
        func = node.func
        if isinstance(func, ast.Name):
            return func.id
        if isinstance(func, ast.Attribute):
            return func.attr
        return None
