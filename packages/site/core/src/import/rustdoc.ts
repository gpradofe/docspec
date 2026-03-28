/**
 * Import Rustdoc JSON output into DocSpec format.
 *
 * Rustdoc JSON is generated via `cargo doc --output-format json` and contains
 * a complete representation of a Rust crate's public API including modules,
 * structs, enums, traits, functions, impls, and doc comments.
 *
 * This importer maps the Rustdoc JSON schema to DocSpec v3.0.0:
 *   - Crate      -> Artifact
 *   - Modules    -> DocSpec Modules
 *   - Structs    -> Member (kind: "struct")
 *   - Enums      -> Member (kind: "enum" / "tagged_union")
 *   - Traits     -> Member (kind: "trait")
 *   - Functions  -> Member (kind: "function")
 *   - Type aliases -> Member (kind: "type_alias")
 *   - Constants  -> Member (kind: "constant")
 *   - Doc comments -> description
 */

import * as fs from "node:fs/promises";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface RustdocImportOptions {
  /** Path to the rustdoc JSON file (e.g. `target/doc/crate_name.json`). */
  jsonPath: string;
}

export interface ImportResult {
  docspec: "3.0.0";
  artifact: {
    groupId: string;
    artifactId: string;
    version: string;
    language: string;
    frameworks?: string[];
  };
  modules: ImportedModule[];
}

interface ImportedModule {
  id: string;
  name: string;
  description?: string;
  members?: ImportedMember[];
}

interface ImportedMember {
  kind: string;
  name: string;
  qualified: string;
  description?: string;
  visibility?: string;
  typeParams?: string[];
  fields?: ImportedField[];
  methods?: ImportedMethod[];
  values?: string[];
  implements?: string[];
}

interface ImportedField {
  name: string;
  type: string;
  description?: string;
  visibility?: string;
}

interface ImportedMethod {
  name: string;
  description?: string;
  params?: ImportedParam[];
  returns?: { type?: string; description?: string };
  visibility?: string;
  modifiers?: string[];
}

interface ImportedParam {
  name: string;
  type: string;
  description?: string;
}

// ---------------------------------------------------------------------------
// Rustdoc JSON types (subset — enough for extraction)
// ---------------------------------------------------------------------------

interface RustdocJson {
  root: string;
  crate_version?: string;
  includes_private?: boolean;
  index: Record<string, RustdocItem>;
  paths: Record<string, RustdocPath>;
  external_crates: Record<string, { name: string }>;
  format_version: number;
}

interface RustdocItem {
  id: string;
  crate_id: number;
  name?: string;
  span?: { filename: string; begin: [number, number]; end: [number, number] };
  visibility: string;
  docs?: string;
  links?: Record<string, string>;
  attrs?: string[];
  deprecation?: { since?: string; note?: string };
  inner: RustdocItemInner;
}

type RustdocItemInner =
  | { module: { is_crate: boolean; items: string[] } }
  | { struct: { kind: unknown; generics: RustdocGenerics; impls: string[] } }
  | { enum: { generics: RustdocGenerics; variants_stripped: boolean; variants: string[]; impls: string[] } }
  | { trait: { is_auto: boolean; is_unsafe: boolean; items: string[]; generics: RustdocGenerics; bounds: RustdocGenericBound[] } }
  | { function: { decl: RustdocDecl; generics: RustdocGenerics; header: RustdocHeader } }
  | { type_alias: { type: RustdocType; generics: RustdocGenerics } }
  | { constant: { type: RustdocType; const: { expr: string; value?: string; is_literal: boolean } } }
  | { variant: { kind: unknown } }
  | { impl: { is_synthetic: boolean; generics: RustdocGenerics; provided_trait_methods: string[]; trait?: RustdocType; for: RustdocType; items: string[]; negative: boolean } }
  | { struct_field: RustdocType }
  | { static: { type: RustdocType; mutable: boolean; expr: string } }
  | { macro: string }
  | { proc_macro: { kind: string; helpers: string[] } }
  | Record<string, unknown>;

interface RustdocGenerics {
  params?: RustdocGenericParam[];
  where_predicates?: unknown[];
}

interface RustdocGenericParam {
  name: string;
  kind: unknown;
}

interface RustdocGenericBound {
  trait_bound?: { trait: RustdocType };
}

interface RustdocDecl {
  inputs: [string, RustdocType][];
  output?: RustdocType;
  c_variadic: boolean;
}

interface RustdocHeader {
  const: boolean;
  unsafe: boolean;
  async: boolean;
  abi: string;
}

interface RustdocType {
  resolved_path?: { name: string; id: string; args?: unknown };
  primitive?: string;
  tuple?: RustdocType[];
  slice?: RustdocType;
  array?: { type: RustdocType; len: string };
  raw_pointer?: { mutable: boolean; type: RustdocType };
  borrowed_ref?: { lifetime?: string; mutable: boolean; type: RustdocType };
  qualified_path?: { name: string; args?: unknown; self_type: RustdocType; trait?: RustdocType };
  generic?: string;
  impl_trait?: RustdocGenericBound[];
  function_pointer?: unknown;
  infer?: Record<string, never>;
  [key: string]: unknown;
}

interface RustdocPath {
  crate_id: number;
  path: string[];
  kind: string;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Import documentation from a Rustdoc JSON file into DocSpec format.
 *
 * The JSON is generated by running:
 * ```
 * cargo +nightly doc --output-format json
 * ```
 */
export async function importFromRustdoc(
  jsonPath: string,
): Promise<ImportResult> {
  const raw = await fs.readFile(jsonPath, "utf-8");

  let rustdoc: RustdocJson;
  try {
    rustdoc = JSON.parse(raw) as RustdocJson;
  } catch (err) {
    throw new Error(
      `Failed to parse Rustdoc JSON at ${jsonPath}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!rustdoc.index || !rustdoc.root) {
    throw new Error(
      `Invalid Rustdoc JSON: missing 'index' or 'root' field in ${jsonPath}`,
    );
  }

  const rootItem = rustdoc.index[rustdoc.root];
  if (!rootItem) {
    throw new Error(
      `Root item ${rustdoc.root} not found in Rustdoc JSON index`,
    );
  }

  const crateName = rootItem.name ?? "unknown-crate";
  const crateVersion = rustdoc.crate_version ?? "0.0.0";

  // Build module tree ---
  const modules = buildModules(rustdoc, rustdoc.root, crateName);

  return {
    docspec: "3.0.0",
    artifact: {
      groupId: "crates.io",
      artifactId: crateName,
      version: crateVersion,
      language: "rust",
    },
    modules,
  };
}

// ---------------------------------------------------------------------------
// Module tree builder
// ---------------------------------------------------------------------------

function buildModules(
  doc: RustdocJson,
  rootId: string,
  crateName: string,
): ImportedModule[] {
  const rootItem = doc.index[rootId];
  if (!rootItem) return [];

  const inner = rootItem.inner as { module?: { is_crate: boolean; items: string[] } };
  if (!inner.module) return [];

  const modules: ImportedModule[] = [];

  // Process each child of the root module.
  for (const childId of inner.module.items) {
    const child = doc.index[childId];
    if (!child) continue;

    const childInner = child.inner as { module?: { is_crate: boolean; items: string[] } };

    if (childInner.module) {
      // This is a sub-module — create a DocSpec module for it.
      const moduleMembers = extractModuleMembers(doc, childId, crateName);
      modules.push({
        id: child.name ?? childId,
        name: child.name ?? childId,
        description: child.docs ?? undefined,
        members: moduleMembers.length > 0 ? moduleMembers : undefined,
      });
    }
  }

  // Also collect top-level items (not in sub-modules) into a root module.
  const topLevelMembers = extractModuleMembers(doc, rootId, crateName);
  if (topLevelMembers.length > 0 || modules.length === 0) {
    modules.unshift({
      id: crateName,
      name: crateName,
      description: rootItem.docs ?? undefined,
      members: topLevelMembers.length > 0 ? topLevelMembers : undefined,
    });
  }

  return modules;
}

/** Extract all non-module items from a module as DocSpec members. */
function extractModuleMembers(
  doc: RustdocJson,
  moduleId: string,
  crateName: string,
): ImportedMember[] {
  const moduleItem = doc.index[moduleId];
  if (!moduleItem) return [];

  const inner = moduleItem.inner as { module?: { items: string[] } };
  if (!inner.module) return [];

  const members: ImportedMember[] = [];
  const modulePath = moduleItem.name ?? crateName;

  for (const childId of inner.module.items) {
    const child = doc.index[childId];
    if (!child) continue;

    // Skip private items.
    if (child.visibility !== "public" && child.visibility !== "default") {
      continue;
    }

    const member = convertItem(doc, child, modulePath);
    if (member) {
      members.push(member);
    }
  }

  return members;
}

/** Convert a single Rustdoc item to a DocSpec member. */
function convertItem(
  doc: RustdocJson,
  item: RustdocItem,
  parentPath: string,
): ImportedMember | null {
  const name = item.name ?? "unnamed";
  const qualified = `${parentPath}::${name}`;
  const visibility = item.visibility === "public" ? "public" : item.visibility;

  const inner = item.inner as Record<string, unknown>;

  // --- Struct ---
  if (inner.struct) {
    const structData = inner.struct as {
      kind: unknown;
      generics: RustdocGenerics;
      impls: string[];
    };
    const typeParams = extractGenericParams(structData.generics);
    const fields = extractStructFields(doc, item);
    const methods = extractImplMethods(doc, structData.impls);
    const traitImpls = extractTraitImpls(doc, structData.impls);

    return {
      kind: "struct",
      name,
      qualified,
      description: item.docs ?? undefined,
      visibility,
      typeParams: typeParams.length > 0 ? typeParams : undefined,
      fields: fields.length > 0 ? fields : undefined,
      methods: methods.length > 0 ? methods : undefined,
      implements: traitImpls.length > 0 ? traitImpls : undefined,
    };
  }

  // --- Enum ---
  if (inner.enum) {
    const enumData = inner.enum as {
      generics: RustdocGenerics;
      variants: string[];
      impls: string[];
    };
    const typeParams = extractGenericParams(enumData.generics);
    const variantNames = enumData.variants
      .map((id) => doc.index[id]?.name)
      .filter((n): n is string => !!n);
    const methods = extractImplMethods(doc, enumData.impls);
    const traitImpls = extractTraitImpls(doc, enumData.impls);

    // Determine if this is a simple enum or a tagged union (has tuple/struct variants).
    const hasComplexVariants = enumData.variants.some((vid) => {
      const v = doc.index[vid];
      if (!v) return false;
      const vInner = v.inner as { variant?: { kind: unknown } };
      if (!vInner.variant) return false;
      const kind = vInner.variant.kind;
      return typeof kind === "object" && kind !== null;
    });

    return {
      kind: hasComplexVariants ? "tagged_union" : "enum",
      name,
      qualified,
      description: item.docs ?? undefined,
      visibility,
      typeParams: typeParams.length > 0 ? typeParams : undefined,
      values: variantNames.length > 0 ? variantNames : undefined,
      methods: methods.length > 0 ? methods : undefined,
      implements: traitImpls.length > 0 ? traitImpls : undefined,
    };
  }

  // --- Trait ---
  if (inner.trait) {
    const traitData = inner.trait as {
      is_auto: boolean;
      is_unsafe: boolean;
      items: string[];
      generics: RustdocGenerics;
      bounds: RustdocGenericBound[];
    };
    const typeParams = extractGenericParams(traitData.generics);
    const methods = extractTraitMethods(doc, traitData.items);
    const superTraits = traitData.bounds
      .map((b) => {
        if (b.trait_bound?.trait) return renderType(b.trait_bound.trait);
        return undefined;
      })
      .filter((s): s is string => !!s);

    return {
      kind: "trait",
      name,
      qualified,
      description: item.docs ?? undefined,
      visibility,
      typeParams: typeParams.length > 0 ? typeParams : undefined,
      methods: methods.length > 0 ? methods : undefined,
      implements: superTraits.length > 0 ? superTraits : undefined,
    };
  }

  // --- Function ---
  if (inner.function) {
    const fnData = inner.function as {
      decl: RustdocDecl;
      generics: RustdocGenerics;
      header: RustdocHeader;
    };
    const typeParams = extractGenericParams(fnData.generics);
    const params = fnData.decl.inputs.map(([pName, pType]) => ({
      name: pName,
      type: renderType(pType),
    }));
    const returnType = fnData.decl.output ? renderType(fnData.decl.output) : undefined;
    const modifiers: string[] = [];
    if (fnData.header.async) modifiers.push("async");
    if (fnData.header.unsafe) modifiers.push("unsafe");
    if (fnData.header.const) modifiers.push("const");

    return {
      kind: "function",
      name,
      qualified,
      description: item.docs ?? undefined,
      visibility,
      typeParams: typeParams.length > 0 ? typeParams : undefined,
      methods: [
        {
          name,
          description: item.docs ?? undefined,
          params: params.length > 0 ? params : undefined,
          returns: returnType ? { type: returnType } : undefined,
          visibility,
          modifiers: modifiers.length > 0 ? modifiers : undefined,
        },
      ],
    };
  }

  // --- Type Alias ---
  if (inner.type_alias) {
    const aliasData = inner.type_alias as {
      type: RustdocType;
      generics: RustdocGenerics;
    };
    const typeParams = extractGenericParams(aliasData.generics);

    return {
      kind: "type_alias",
      name,
      qualified,
      description:
        item.docs ??
        `Type alias for ${renderType(aliasData.type)}`,
      visibility,
      typeParams: typeParams.length > 0 ? typeParams : undefined,
    };
  }

  // --- Constant ---
  if (inner.constant) {
    const constData = inner.constant as {
      type: RustdocType;
      const: { expr: string; value?: string };
    };

    return {
      kind: "constant",
      name,
      qualified,
      description:
        item.docs ??
        `Constant of type ${renderType(constData.type)}`,
      visibility,
    };
  }

  // --- Static ---
  if (inner.static) {
    return {
      kind: "constant",
      name,
      qualified,
      description: item.docs ?? undefined,
      visibility,
    };
  }

  // --- Macro ---
  if (inner.macro !== undefined || inner.proc_macro) {
    return {
      kind: "function",
      name: `${name}!`,
      qualified: `${qualified}!`,
      description: item.docs ?? undefined,
      visibility,
    };
  }

  // Skip sub-modules and other items.
  return null;
}

// ---------------------------------------------------------------------------
// Impl / method extraction
// ---------------------------------------------------------------------------

/** Extract methods from impl blocks. */
function extractImplMethods(
  doc: RustdocJson,
  implIds: string[],
): ImportedMethod[] {
  const methods: ImportedMethod[] = [];

  for (const implId of implIds) {
    const implItem = doc.index[implId];
    if (!implItem) continue;

    const implInner = implItem.inner as {
      impl?: {
        is_synthetic: boolean;
        trait?: RustdocType;
        items: string[];
      };
    };
    if (!implInner.impl) continue;

    // Skip synthetic impls (auto-derived traits).
    if (implInner.impl.is_synthetic) continue;

    // Skip trait impls — we only want inherent methods here.
    if (implInner.impl.trait) continue;

    for (const methodId of implInner.impl.items) {
      const methodItem = doc.index[methodId];
      if (!methodItem) continue;
      if (methodItem.visibility !== "public" && methodItem.visibility !== "default") continue;

      const fnInner = methodItem.inner as {
        function?: { decl: RustdocDecl; generics: RustdocGenerics; header: RustdocHeader };
      };
      if (!fnInner.function) continue;

      const method = convertFunction(methodItem, fnInner.function);
      methods.push(method);
    }
  }

  return methods;
}

/** Extract method signatures from trait definition items. */
function extractTraitMethods(
  doc: RustdocJson,
  itemIds: string[],
): ImportedMethod[] {
  const methods: ImportedMethod[] = [];

  for (const itemId of itemIds) {
    const item = doc.index[itemId];
    if (!item) continue;

    const fnInner = item.inner as {
      function?: { decl: RustdocDecl; generics: RustdocGenerics; header: RustdocHeader };
    };
    if (!fnInner.function) continue;

    methods.push(convertFunction(item, fnInner.function));
  }

  return methods;
}

/** Extract trait names from impl blocks. */
function extractTraitImpls(
  doc: RustdocJson,
  implIds: string[],
): string[] {
  const traits: string[] = [];

  for (const implId of implIds) {
    const implItem = doc.index[implId];
    if (!implItem) continue;

    const implInner = implItem.inner as {
      impl?: { trait?: RustdocType; is_synthetic: boolean };
    };
    if (!implInner.impl?.trait) continue;
    if (implInner.impl.is_synthetic) continue;

    const traitName = renderType(implInner.impl.trait);
    if (traitName && !traits.includes(traitName)) {
      traits.push(traitName);
    }
  }

  return traits;
}

/** Convert a Rustdoc function item to an ImportedMethod. */
function convertFunction(
  item: RustdocItem,
  fnData: { decl: RustdocDecl; generics: RustdocGenerics; header: RustdocHeader },
): ImportedMethod {
  const params = fnData.decl.inputs
    .filter(([pName]) => pName !== "self")
    .map(([pName, pType]) => ({
      name: pName,
      type: renderType(pType),
    }));

  const returnType = fnData.decl.output ? renderType(fnData.decl.output) : undefined;

  const modifiers: string[] = [];
  if (fnData.header.async) modifiers.push("async");
  if (fnData.header.unsafe) modifiers.push("unsafe");
  if (fnData.header.const) modifiers.push("const");

  // Determine if the method takes &self, &mut self, or self.
  const selfParam = fnData.decl.inputs.find(([pName]) => pName === "self");
  if (selfParam) {
    const selfType = renderType(selfParam[1]);
    if (selfType.includes("&mut")) modifiers.push("&mut self");
    else if (selfType.includes("&")) modifiers.push("&self");
    else modifiers.push("self");
  }

  return {
    name: item.name ?? "unnamed",
    description: item.docs ?? undefined,
    params: params.length > 0 ? params : undefined,
    returns: returnType && returnType !== "()" ? { type: returnType } : undefined,
    visibility: item.visibility === "public" ? "public" : item.visibility,
    modifiers: modifiers.length > 0 ? modifiers : undefined,
  };
}

// ---------------------------------------------------------------------------
// Struct field extraction
// ---------------------------------------------------------------------------

function extractStructFields(
  doc: RustdocJson,
  structItem: RustdocItem,
): ImportedField[] {
  const fields: ImportedField[] = [];
  const inner = structItem.inner as {
    struct?: { kind: unknown };
  };
  if (!inner.struct) return fields;

  const kind = inner.struct.kind as
    | { plain: { fields: string[]; fields_stripped: boolean } }
    | { tuple: (string | null)[] }
    | { unit: Record<string, never> }
    | Record<string, unknown>;

  if ("plain" in kind && kind.plain?.fields) {
    for (const fieldId of kind.plain.fields) {
      const fieldItem = doc.index[fieldId];
      if (!fieldItem) continue;

      const fieldInner = fieldItem.inner as { struct_field?: RustdocType };
      if (!fieldInner.struct_field) continue;

      fields.push({
        name: fieldItem.name ?? "unnamed",
        type: renderType(fieldInner.struct_field),
        description: fieldItem.docs ?? undefined,
        visibility: fieldItem.visibility === "public" ? "public" : fieldItem.visibility,
      });
    }
  }

  if ("tuple" in kind && Array.isArray(kind.tuple)) {
    for (let i = 0; i < kind.tuple.length; i++) {
      const fieldId = kind.tuple[i];
      if (!fieldId) continue;
      const fieldItem = doc.index[fieldId];
      if (!fieldItem) continue;

      const fieldInner = fieldItem.inner as { struct_field?: RustdocType };
      if (!fieldInner.struct_field) continue;

      fields.push({
        name: String(i),
        type: renderType(fieldInner.struct_field),
        description: fieldItem.docs ?? undefined,
        visibility: fieldItem.visibility === "public" ? "public" : fieldItem.visibility,
      });
    }
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Generics extraction
// ---------------------------------------------------------------------------

function extractGenericParams(generics: RustdocGenerics): string[] {
  if (!generics.params) return [];
  return generics.params.map((p) => p.name);
}

// ---------------------------------------------------------------------------
// Type rendering
// ---------------------------------------------------------------------------

/** Render a Rustdoc type to a human-readable string. */
function renderType(type: RustdocType): string {
  if (!type || typeof type !== "object") return "unknown";

  if (type.resolved_path) {
    return type.resolved_path.name;
  }

  if (type.primitive) {
    return type.primitive;
  }

  if (type.generic) {
    return type.generic;
  }

  if (type.tuple) {
    if (type.tuple.length === 0) return "()";
    return `(${type.tuple.map(renderType).join(", ")})`;
  }

  if (type.slice) {
    return `[${renderType(type.slice)}]`;
  }

  if (type.array) {
    const arrType = type.array as { type: RustdocType; len: string };
    return `[${renderType(arrType.type)}; ${arrType.len}]`;
  }

  if (type.raw_pointer) {
    const ptr = type.raw_pointer as { mutable: boolean; type: RustdocType };
    return `*${ptr.mutable ? "mut" : "const"} ${renderType(ptr.type)}`;
  }

  if (type.borrowed_ref) {
    const ref = type.borrowed_ref as {
      lifetime?: string;
      mutable: boolean;
      type: RustdocType;
    };
    const lt = ref.lifetime ? `${ref.lifetime} ` : "";
    const mut = ref.mutable ? "mut " : "";
    return `&${lt}${mut}${renderType(ref.type)}`;
  }

  if (type.qualified_path) {
    const qp = type.qualified_path as { name: string; self_type: RustdocType; trait?: RustdocType };
    const selfType = renderType(qp.self_type);
    const traitName = qp.trait ? renderType(qp.trait) : undefined;
    return traitName
      ? `<${selfType} as ${traitName}>::${qp.name}`
      : `${selfType}::${qp.name}`;
  }

  if (type.impl_trait) {
    const bounds = (type.impl_trait as RustdocGenericBound[])
      .map((b) => (b.trait_bound?.trait ? renderType(b.trait_bound.trait) : "?"))
      .join(" + ");
    return `impl ${bounds}`;
  }

  if (type.infer !== undefined) {
    return "_";
  }

  return "unknown";
}
