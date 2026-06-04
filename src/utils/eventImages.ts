import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';

const EXTS   = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const DIR    = path.join(process.cwd(), 'assets', 'events');

// ── Key → filename ─────────────────────────────────────────────────────────
const KEYS: Record<string, string> = {
  // Explore events
  combat:       'combat',
  ambush:       'ambush',
  legacy:       'legacy',
  merchant:     'merchant',
  spring:       'spring',
  trap:         'trap',
  altar:        'altar',
  mysterious:   'mysterious',
  villager:     'villager',
  caravan:      'caravan',
  loot:         'loot',
  // Combat outcomes
  boss:         'boss',
  victory:      'victory',
  death:        'death',
  // UI
  rest:         'rest',
  explore:      'explore',
  // Zones
  zone_village: 'zone_village',
  zone_forest:  'zone_forest',
  zone_shrine:  'zone_shrine',
  zone_mines:   'zone_mines',
  zone_wastes:  'zone_wastes',
};

// ── Resolve ────────────────────────────────────────────────────────────────
function resolve(key: string): { file: AttachmentBuilder; url: string } | null {
  const base = KEYS[key] ?? key;
  for (const ext of EXTS) {
    const full = path.join(DIR, `${base}${ext}`);
    if (fs.existsSync(full)) {
      return {
        file: new AttachmentBuilder(full, { name: `${base}${ext}` }),
        url:  `attachment://${base}${ext}`,
      };
    }
  }
  return null;
}

/**
 * Apply an event image to an embed.
 * Returns { embed (with image set if found), files (to pass to editReply) }
 */
export function withImage(
  embed: EmbedBuilder, key: string
): { embed: EmbedBuilder; files: AttachmentBuilder[] } {
  const result = resolve(key);
  if (result) {
    embed.setImage(result.url);
    return { embed, files: [result.file] };
  }
  return { embed, files: [] };
}
