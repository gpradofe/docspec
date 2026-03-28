/**
 * @docspec:module id="docspec-ts-naming-analyzer" name="DSTI Naming Analyzer"
 * @docspec:description "Parses method names to extract semantic verbs and objects using
 *   camelCase conventions. Used by the DSTI (Deep Structural and Textual Intent) system
 *   to infer developer intent from naming patterns. Supports 80+ verbs across 20+ intent
 *   categories. Port of the Java NamingAnalyzer."
 * @docspec:boundary "processor-internal"
 * @docspec:since "3.0.0"
 * @docspec:deterministic true
 */

export interface NameSemantics {
  verb: string;
  object: string;
  intent: string;
}

/**
 * Known verb prefixes, ordered longest-first where needed to avoid prefix collisions.
 * For example, "initialize" must be checked before "init" to avoid incorrect splitting.
 */
const VERBS: string[] = [
  "get", "set", "is", "has", "find", "create", "delete", "remove",
  "update", "save", "add", "validate", "check", "compute", "calculate",
  "process", "handle", "convert", "transform", "parse", "format",
  "build", "generate", "initialize", "init", "load", "fetch",
  "send", "receive", "publish", "subscribe", "notify", "dispatch",
  "sync", "migrate", "schedule", "retry", "batch",
  "aggregate", "merge", "split", "emit", "enrich", "filter",
  "archive", "audit", "bind", "broadcast", "cache", "clone",
  "compile", "configure", "decrypt", "deploy", "enqueue", "escalate",
  "encrypt", "execute", "export", "import", "index", "invalidate",
  "invoke", "map", "monitor", "normalize", "orchestrate", "poll",
  "queue", "rebalance", "reconcile", "recover", "refresh", "register",
  "render", "replicate", "reset", "resolve", "restart", "restore",
  "revoke", "rollback", "rotate", "run", "sanitize", "scan",
  "seed", "setup", "shutdown", "snapshot", "start", "stop",
  "stream", "suspend", "teardown", "throttle", "track", "trigger",
  "unsubscribe", "upgrade", "verify", "warm",
];

/**
 * Maps verb strings to intent categories. Mirrors the Java NamingAnalyzer switch.
 */
const INTENT_MAP: Record<string, string> = {
  get: "query",
  find: "query",
  fetch: "query",
  load: "query",
  is: "query",
  has: "query",
  set: "mutation",
  update: "mutation",
  save: "mutation",
  add: "mutation",
  create: "creation",
  build: "creation",
  generate: "creation",
  initialize: "creation",
  init: "creation",
  delete: "deletion",
  remove: "deletion",
  validate: "validation",
  check: "validation",
  verify: "validation",
  compute: "computation",
  calculate: "computation",
  process: "computation",
  convert: "transformation",
  parse: "transformation",
  format: "transformation",
  compile: "transformation",
  render: "transformation",
  export: "transformation",
  import: "transformation",
  handle: "handler",
  dispatch: "handler",
  send: "emission",
  receive: "consumption",
  sync: "synchronize",
  migrate: "migrate",
  schedule: "schedule",
  retry: "retry",
  batch: "batch-process",
  aggregate: "aggregate",
  merge: "merge",
  split: "split",
  notify: "notify",
  emit: "emit",
  publish: "publish",
  subscribe: "subscribe",
  unsubscribe: "subscribe",
  transform: "transform",
  enrich: "enrich",
  filter: "filter",
  // Archival
  archive: "archival",
  snapshot: "archival",
  // Observability
  audit: "observability",
  monitor: "observability",
  track: "observability",
  // Caching
  cache: "caching",
  warm: "caching",
  refresh: "caching",
  invalidate: "caching",
  // Security
  encrypt: "security",
  decrypt: "security",
  sanitize: "security",
  revoke: "security",
  rotate: "security",
  // Lifecycle
  deploy: "lifecycle",
  restart: "lifecycle",
  shutdown: "lifecycle",
  start: "lifecycle",
  stop: "lifecycle",
  suspend: "lifecycle",
  // Messaging
  enqueue: "messaging",
  queue: "messaging",
  poll: "messaging",
  stream: "messaging",
  broadcast: "messaging",
  // Orchestration
  orchestrate: "orchestration",
  // Recovery
  recover: "recovery",
  rollback: "recovery",
  restore: "recovery",
  reset: "recovery",
  // Configuration
  seed: "configuration",
  setup: "configuration",
  teardown: "configuration",
  configure: "configuration",
  // Execution
  bind: "execution",
  register: "execution",
  resolve: "execution",
  invoke: "execution",
  execute: "execution",
  run: "execution",
  // Maintenance
  index: "maintenance",
  scan: "maintenance",
  rebalance: "maintenance",
  reconcile: "maintenance",
  // Data management
  clone: "data-management",
  replicate: "data-management",
  normalize: "data-management",
  // Flow control
  throttle: "flow-control",
  escalate: "flow-control",
  // Misc (mapped to closest existing category)
  trigger: "emission",
  upgrade: "mutation",
  map: "transformation",
};

export class NamingAnalyzer {
  /**
   * Analyzes a method name and extracts its semantic components.
   *
   * @param methodName the simple name of the method (camelCase)
   * @returns a NameSemantics record with verb, object, and intent category
   */
  analyze(methodName: string): NameSemantics {
    // Try to match a known verb prefix
    for (const verb of VERBS) {
      if (methodName.startsWith(verb) && methodName.length > verb.length) {
        const nextChar = methodName.charAt(verb.length);
        if (nextChar === nextChar.toUpperCase() && nextChar !== nextChar.toLowerCase()) {
          const object = methodName.substring(verb.length);
          const intent = INTENT_MAP[verb] ?? "unknown";
          return { verb, object: this.splitCamelCase(object), intent };
        }
      }
    }

    // Special case: entire name matches a known verb
    if (INTENT_MAP[methodName]) {
      return { verb: methodName, object: "", intent: INTENT_MAP[methodName] };
    }

    // Fallback: the entire name is treated as the verb with unknown intent
    return { verb: methodName, object: "", intent: "unknown" };
  }

  /**
   * Inserts spaces before uppercase letters to convert camelCase to
   * human-readable lower-case text.
   *
   * Example: "UserProfile" -> "user profile"
   */
  private splitCamelCase(s: string): string {
    return s.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase().trim();
  }
}
