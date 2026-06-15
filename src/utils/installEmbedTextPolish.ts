import { EmbedBuilder } from 'discord.js';
import { polishGameText, polishGameTitle } from './textPolish';

let installed = false;

function safeText(value: unknown, fallback = '—'): string {
  const text = polishGameText(String(value ?? ''));
  return text.trim().length > 0 ? text : fallback;
}

function safeTitle(value: unknown, fallback = 'RPG'): string {
  const text = polishGameTitle(String(value ?? ''));
  return text.trim().length > 0 ? text : fallback;
}

function polishField(field: any): any {
  if (!field || typeof field !== 'object') return field;
  return {
    ...field,
    name: typeof field.name === 'string' ? safeTitle(field.name, 'Thông tin') : field.name,
    value: typeof field.value === 'string' ? safeText(field.value) : field.value,
  };
}

function polishFieldsArg(args: any[]): any[] {
  return args.map(arg => Array.isArray(arg) ? arg.map(polishField) : polishField(arg));
}

export function installEmbedTextPolish(): void {
  if (installed) return;
  installed = true;

  const proto = EmbedBuilder.prototype as any;
  const originalSetDescription = proto.setDescription;
  const originalSetTitle = proto.setTitle;
  const originalSetFooter = proto.setFooter;
  const originalAddFields = proto.addFields;
  const originalSetFields = proto.setFields;

  proto.setTitle = function patchedSetTitle(title: string) {
    return originalSetTitle.call(this, safeTitle(title));
  };

  proto.setDescription = function patchedSetDescription(description: string | null | undefined) {
    if (description === null || description === undefined) {
      return originalSetDescription.call(this, null);
    }
    const text = polishGameText(description);
    return originalSetDescription.call(this, text.trim().length > 0 ? text : null);
  };

  proto.setFooter = function patchedSetFooter(options: any) {
    if (options?.text) {
      return originalSetFooter.call(this, { ...options, text: safeText(options.text) });
    }
    return originalSetFooter.call(this, options);
  };

  proto.addFields = function patchedAddFields(...fields: any[]) {
    return originalAddFields.apply(this, polishFieldsArg(fields));
  };

  proto.setFields = function patchedSetFields(...fields: any[]) {
    return originalSetFields.apply(this, polishFieldsArg(fields));
  };
}

installEmbedTextPolish();
