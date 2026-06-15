import { describe, it, expect } from 'vitest';
import { PrefixCommandOptions } from '../src/commands/prefixOptions';
import { prefixSpec as guildSpec } from '../src/commands/guild';
import { prefixSpec as petSpec } from '../src/commands/pet';
import { prefixSpec as codeSpec } from '../src/commands/code';
import { prefixSpec as worldbossSpec } from '../src/commands/worldboss';

// getString / getSubcommand never touch the message object, so a stub is fine.
const msg: any = {};
const opt = (cmd: string, args: string, spec?: any) =>
  new PrefixCommandOptions(msg, cmd, args, spec);

describe('prefix parser parity (A1 refactor)', () => {
  it('guild create: name = all-but-last token, tag = last token', () => {
    const o = opt('guild', 'create My Big Guild MYTAG', guildSpec);
    expect(o.getSubcommand()).toBe('create');
    expect(o.getString('name')).toBe('My Big Guild');
    expect(o.getString('tag')).toBe('MYTAG');
  });

  it('guild buff: type = first payload token', () => {
    const o = opt('guild', 'buff atk_boost', guildSpec);
    expect(o.getSubcommand()).toBe('buff');
    expect(o.getString('type')).toBe('atk_boost');
  });

  it('guild war group: group + subcommand + target (numbers stripped)', () => {
    const o = opt('guild', 'war declare Dark Clan 5', guildSpec);
    expect(o.getSubcommandGroup()).toBe('war');
    expect(o.getSubcommand()).toBe('declare');
    expect(o.getString('target')).toBe('Dark Clan');
  });

  it('pet: pet_id = first payload token; default sub = list', () => {
    expect(opt('pet', 'equip wolf_01', petSpec).getString('pet_id')).toBe('wolf_01');
    expect(opt('pet', '', petSpec).getSubcommand()).toBe('list');
  });

  it('code: code option consumes the whole arg string', () => {
    expect(opt('code', 'ABC 123', codeSpec).getString('code')).toBe('ABC 123');
  });

  it('worldboss: default sub = status', () => {
    expect(opt('worldboss', '', worldbossSpec).getSubcommand()).toBe('status');
  });

  it('generic: item whole args; unknown option joins payload after subcommand token', () => {
    expect(opt('use', 'health potion', undefined).getString('item')).toBe('health potion');
    expect(opt('foo', 'attack a b c', undefined).getString('x')).toBe('a b c');
  });

  it('getInteger picks the last numeric token', () => {
    expect(opt('shop', 'buy potion 25', undefined).getInteger('qty')).toBe(25);
  });
});
