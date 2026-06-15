/** Renders a filled/empty progress bar */
export function bar(current: number, max: number, len = 10): string {
  const filled = Math.max(0, Math.min(len, Math.round((current / max) * len)));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

/** Formats a number with commas */
export function num(n: number): string {
  return n.toLocaleString('en-US');
}

/** Returns a colored HP string based on percentage */
export function hpLabel(hp: number, maxHp: number): string {
  const pct = hp / maxHp;
  if (pct > 0.6) return `🟢 ${hp}/${maxHp}`;
  if (pct > 0.3) return `🟡 ${hp}/${maxHp}`;
  return `🔴 ${hp}/${maxHp}`;
}

/** Formats EXP needed to level up */
export function expNext(level: number): number {
  // Slower progression curve: early levels still move, but mid/late no longer snowball too fast.
  return Math.floor(120 + level * 60 + Math.pow(level, 1.8) * 28);
}

/** Random integer between min and max (inclusive) */
export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Pick a random element from an array */
export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Timestamp helper for Discord */
export function relativeTime(unixSeconds: number): string {
  return `<t:${unixSeconds}:R>`;
}

/** Truncate a string with ellipsis */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

/** Pad a string to a given length */
export function padEnd(str: string, len: number): string {
  return str.padEnd(len, ' ');
}

/** Pick a random element weighted by a numeric property (e.g. loot tables, gacha, events). */
export function pickWeighted<T>(items: readonly T[], weightKey: keyof T): T {
  const total = items.reduce((sum, it) => sum + Math.max(0, Number(it[weightKey]) || 0), 0);
  let r = Math.random() * (total || 1);
  for (const it of items) {
    r -= Math.max(0, Number(it[weightKey]) || 0);
    if (r <= 0) return it;
  }
  return items[0];
}
