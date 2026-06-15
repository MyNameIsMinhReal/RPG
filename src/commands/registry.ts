import fs from 'node:fs';
import path from 'node:path';
import type { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { PrefixSpec } from './prefixOptions';

/**
 * Shape that every real slash-command module must satisfy.
 * A file in this folder is treated as a command only if it exports BOTH
 * `data` (the SlashCommandBuilder) and `execute` (the handler). Helper files
 * such as `exploreEvents.*` or `fish.ts` are skipped automatically because
 * they do not export `execute`.
 */
export interface CommandModule {
  /** SlashCommandBuilder (or anything with a `.name` + `.toJSON()`). */
  data: SlashCommandBuilder | { name: string; toJSON: () => unknown };
  /** The command handler. */
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  /** Optional text-prefix aliases, e.g. `['p', 'pf', 'me']` for `profile`. */
  aliases?: string[];
  /** Optional per-command prefix-arg parsing rules (see prefixOptions.ts). */
  prefixSpec?: PrefixSpec;
  /**
   * Escape hatch: set to `true` to keep a module out of the command list even
   * though it exports `data` + `execute`. Useful if a future file has a
   * command-shaped export but should not be deployed as a standalone slash
   * command. (No module currently needs this.)
   */
  hidden?: boolean;
}

export interface LoadedCommand extends CommandModule {
  /** Canonical command name, taken from `data.name`. */
  name: string;
}

function isCommandModule(mod: unknown): mod is CommandModule {
  if (!mod || typeof mod !== 'object') return false;
  const m = mod as Record<string, unknown>;
  const data = m.data as { name?: unknown } | undefined;
  return typeof m.execute === 'function' && !!data && typeof data.name === 'string';
}

/**
 * Auto-discover every command module in this directory.
 *
 * Works in both runtimes the project uses:
 *  - dev:  ts-node loads `.ts` files from `src/commands`
 *  - prod: node loads compiled `.js` files from `dist/commands`
 *
 * Files are required dynamically and kept only if they look like a command
 * (see {@link isCommandModule}). This means adding a new command is just a
 * matter of dropping a file in this folder — no edits to `index.ts` or
 * `deploy.ts` required.
 */
export function loadCommands(): LoadedCommand[] {
  const dir = __dirname;
  const ext = path.extname(__filename); // '.ts' under ts-node, '.js' once built
  const selfBase = path.basename(__filename);

  const files = fs.readdirSync(dir).filter((file) => {
    if (!file.endsWith(ext)) return false;          // ignore .d.ts/.map/other
    if (file.endsWith('.d.ts')) return false;
    if (file === selfBase) return false;            // don't load this loader
    return true;
  });

  const loaded: LoadedCommand[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require(path.join(dir, file)) as unknown;
    if (!isCommandModule(mod)) continue;            // skip helpers (no execute)
    if (mod.hidden === true) continue;              // skip explicit opt-outs

    const name = (mod.data as { name: string }).name;
    if (seen.has(name)) {
      console.warn(`[registry] Duplicate command name "${name}" in ${file} — skipped.`);
      continue;
    }
    seen.add(name);
    loaded.push({ name, data: mod.data, execute: mod.execute, aliases: mod.aliases, prefixSpec: mod.prefixSpec });
  }

  loaded.sort((a, b) => a.name.localeCompare(b.name));
  return loaded;
}

/**
 * Build the alias → command-name lookup used by the text-prefix parser.
 * Each command's canonical name always maps to itself; declared aliases are
 * added on top. Conflicting aliases are reported and the first one wins.
 */
export function buildAliasMap(commands: LoadedCommand[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const cmd of commands) {
    map.set(cmd.name, cmd.name);
    for (const alias of cmd.aliases ?? []) {
      const key = alias.toLowerCase();
      if (map.has(key) && map.get(key) !== cmd.name) {
        console.warn(`[registry] Alias "${key}" already maps to "${map.get(key)}" — ignoring duplicate from "${cmd.name}".`);
        continue;
      }
      map.set(key, cmd.name);
    }
  }
  return map;
}
