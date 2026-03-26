import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

/**
 * Represents a single `<server>` entry from Maven's settings.xml.
 */
export interface MavenServer {
  id: string;
  username?: string;
  password?: string;
}

/**
 * Parse Maven `settings.xml` to extract `<server>` credentials.
 *
 * Used for authenticating with private Maven repositories when the
 * repository config references a server ID rather than inline credentials.
 *
 * The parser uses a lightweight regex-based approach to avoid pulling in
 * a full XML library as a dependency.
 *
 * @param settingsPath - Absolute path to settings.xml.
 *   Defaults to `~/.m2/settings.xml`.
 * @returns An array of server entries found in the file.
 *   Returns an empty array when the file does not exist or cannot be read.
 */
export async function parseSettingsXml(
  settingsPath?: string,
): Promise<MavenServer[]> {
  const path = settingsPath ?? join(homedir(), ".m2", "settings.xml");

  let xml: string;
  try {
    xml = await readFile(path, "utf-8");
  } catch {
    // File doesn't exist or isn't readable -- perfectly normal on machines
    // that don't use Maven or haven't configured server credentials.
    return [];
  }

  return extractServers(xml);
}

// ── internal helpers ────────────────────────────────────────────────

/**
 * Extract all `<server>` blocks from the raw XML string.
 *
 * We deliberately avoid a full XML parser here to keep the dependency
 * footprint minimal.  The regex approach is sufficient for well-formed
 * Maven settings files (which Maven itself generates / validates).
 */
function extractServers(xml: string): MavenServer[] {
  const servers: MavenServer[] = [];

  // Match each <server>...</server> block (non-greedy).
  const serverBlockRe = /<server>([\s\S]*?)<\/server>/g;
  let blockMatch: RegExpExecArray | null;

  while ((blockMatch = serverBlockRe.exec(xml)) !== null) {
    const block = blockMatch[1];

    const id = extractElement(block, "id");
    if (!id) {
      // A <server> without an <id> is malformed -- skip it.
      continue;
    }

    const server: MavenServer = { id };

    const username = extractElement(block, "username");
    if (username !== undefined) {
      server.username = username;
    }

    const password = extractElement(block, "password");
    if (password !== undefined) {
      // Encrypted passwords (e.g. {aES/GC...}) are returned as-is.
      // Decrypting them would require Maven's master password and its
      // encryption tooling, which is out of scope for this resolver.
      server.password = password;
    }

    servers.push(server);
  }

  return servers;
}

/**
 * Extract the text content of a simple XML element.
 *
 * @returns The trimmed text content, or `undefined` when the element is
 *   absent from the block.
 */
function extractElement(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}>([^<]*)</${tag}>`);
  const match = re.exec(block);
  return match ? match[1].trim() : undefined;
}
