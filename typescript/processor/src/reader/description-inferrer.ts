// @docspec:module {
//   id: "docspec-ts-description-inferrer",
//   name: "Description Inferrer",
//   description: "Generates human-readable descriptions from camelCase identifiers by splitting on uppercase boundaries and mapping the leading verb to a natural-language prefix (e.g., 'getUserProfile' becomes 'Retrieves user profile.'). Used as the Tier 0 fallback when no TSDoc or decorator descriptions are present.",
//   since: "3.0.0"
// }

/**
 * @docspec:boundary "Verb-based description generation from identifier names"
 * @docspec:deterministic
 * @docspec:intentional "Converts method/class names into human-readable documentation strings"
 */
export class DescriptionInferrer {
  private static readonly VERB_MAP: Record<string, string> = {
    get: "Retrieves", find: "Finds", fetch: "Fetches", load: "Loads", read: "Reads",
    create: "Creates", add: "Adds", insert: "Inserts", save: "Saves", store: "Stores",
    update: "Updates", modify: "Modifies", patch: "Patches", change: "Changes",
    delete: "Deletes", remove: "Removes", destroy: "Destroys", drop: "Drops",
    validate: "Validates", check: "Checks", verify: "Verifies", assert: "Asserts",
    process: "Processes", handle: "Handles", execute: "Executes", run: "Runs",
    send: "Sends", publish: "Publishes", emit: "Emits", dispatch: "Dispatches",
    convert: "Converts", transform: "Transforms", map: "Maps", parse: "Parses",
    calculate: "Calculates", compute: "Computes", count: "Counts", sum: "Sums",
    is: "Checks whether", has: "Checks if it has", can: "Determines if it can",
    should: "Determines whether it should",
  };

  /** @docspec:deterministic */
  infer(name: string): string {
    // Split camelCase into words
    const words = name.replace(/([A-Z])/g, " $1").trim().split(/\s+/);
    if (words.length === 0) return "";

    const verb = words[0].toLowerCase();
    const rest = words.slice(1).map(w => w.toLowerCase()).join(" ");
    const prefix = DescriptionInferrer.VERB_MAP[verb];

    if (prefix && rest) {
      return `${prefix} ${rest}.`;
    }
    if (prefix) {
      return `${prefix} the resource.`;
    }

    // Fallback: humanize the name
    return words.join(" ").replace(/^\w/, c => c.toUpperCase()) + ".";
  }
}
