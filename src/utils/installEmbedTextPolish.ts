import { EmbedBuilder } from 'discord.js';
import { polishGameText, polishGameTitle } from './textPolish';

let installed = false;

function polishField(field: any): any {
  if (!field || typeof field !== 'object') return field;
  return {
    ...field,
    name: typeof field.name === 'string' ? polishGameTitle(field.name) : field.name,
    value: typeof field.value === 'string' ? polishGameText(field.value) : field.value,
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
    return originalSetTitle.call(this, polishGameTitle(title));
  };

  proto.setDescription = function patchedSetDescription(description: string) {
    return originalSetDescription.call(this, polishGameText(description));
  };

  proto.setFooter = function patchedSetFooter(options: any) {
    if (options?.text) {
      return originalSetFooter.call(this, { ...options, text: polishGameText(String(options.text)) });
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
