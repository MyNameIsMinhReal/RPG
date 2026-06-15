import type { Message, User } from 'discord.js';

/**
 * Context handed to a command's own prefix parser. Lets each command decide how
 * to pull a string option out of the raw text args instead of index.ts
 * hardcoding `commandName === '...'` branches (Open/Closed).
 */
export interface PrefixParseContext {
  commandName: string;
  argsText: string;
  tokens: string[];
  payload: string[];
  sub: string;
  group: string | null;
}

export interface PrefixSpec {
  /** Subcommand-group names (e.g. guild: ['war', 'stock']). */
  groups?: string[];
  /** Default subcommand when the user types none (e.g. pet → 'list'). */
  defaultSub?: string;
  /**
   * Custom string-option extraction. Return a string/null to use it, or
   * `undefined` to fall back to the generic behavior (payload.join(' ')).
   */
  parseString?: (name: string, ctx: PrefixParseContext) => string | null | undefined;
}

export function stripUserMentionToken(token: string): string | null {
  const match = token.match(/^<@!?(\d+)>$/) ?? token.match(/^(\d{15,25})$/);
  return match?.[1] ?? null;
}

/**
 * Adapts a raw prefix message's text args into the same option-getter surface
 * the slash-command handlers expect. Command-specific parsing rules live in each
 * command's exported `prefixSpec` rather than here.
 */
export class PrefixCommandOptions {
  private readonly tokens: string[];

  constructor(
    private readonly sourceMessage: Message,
    private readonly commandName: string,
    private readonly argsText: string,
    private readonly spec?: PrefixSpec
  ) {
    this.tokens = argsText.trim().split(/\s+/).filter(Boolean);
  }

  private groupNames(): string[] {
    return this.spec?.groups ?? [];
  }

  private subIndex(): number {
    return this.getSubcommandGroup(false) ? 1 : 0;
  }

  private payloadTokens(): string[] {
    const start = this.subIndex() + (this.tokens.length ? 1 : 0);
    return this.tokens.slice(start);
  }

  getString(name: string, required = false): string | null {
    const sub = this.getSubcommand(false);
    const group = this.getSubcommandGroup(false);
    const payload = this.payloadTokens();

    let value: string | null;
    if (name === 'item') {
      // Generic across commands: an "item" option consumes the whole arg string.
      value = this.argsText.trim() || null;
    } else {
      const ctx: PrefixParseContext = {
        commandName: this.commandName, argsText: this.argsText,
        tokens: this.tokens, payload, sub, group,
      };
      const custom = this.spec?.parseString?.(name, ctx);
      value = custom !== undefined ? custom : (payload.join(' ') || null);
    }

    if (!value && required) throw new Error(`Missing required string option: ${name}`);
    return value;
  }

  getInteger(name: string, required = false): number | null {
    const payload = this.payloadTokens();
    const numericToken = [...payload, ...this.tokens].reverse().find(t => /^-?\d+$/.test(t));
    const value = numericToken ? Number.parseInt(numericToken, 10) : null;

    if (value === null && required) throw new Error(`Missing required integer option: ${name}`);
    return value;
  }

  getUser(name: string, required = false): User | null {
    const mentioned = this.sourceMessage.mentions.users.first();
    if (mentioned) return mentioned;

    for (const token of this.tokens) {
      const id = stripUserMentionToken(token);
      if (!id) continue;

      const cached = this.sourceMessage.client.users.cache.get(id);
      if (cached) return cached;

      const member = this.sourceMessage.guild?.members.cache.get(id);
      if (member?.user) return member.user;
    }

    if (required) throw new Error(`Missing required user option: ${name}`);
    return null;
  }

  getSubcommand(required = true): string {
    const group = this.getSubcommandGroup(false);
    const idx = group ? 1 : 0;
    if (this.tokens.length > idx) return this.tokens[idx].toLowerCase();
    const def = this.spec?.defaultSub;
    if (def) return def;
    if (required) throw new Error(`Missing subcommand for ${this.commandName}`);
    return '';
  }

  getSubcommandGroup(required = true): string | null {
    const first = this.tokens[0]?.toLowerCase();
    if (first && this.groupNames().includes(first)) return first;
    if (required) throw new Error(`Missing subcommand group for ${this.commandName}`);
    return null;
  }
}
