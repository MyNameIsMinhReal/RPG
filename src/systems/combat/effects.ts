export interface Effect {
  name: string;
  duration: number;
  value?: number;
  target?: 'player' | 'enemy';
}

// ── Effect helpers ────────────────────────────────────────────────────────
export function parseEffects(raw: string): Effect[] {
  try { return JSON.parse(raw); } catch { return []; }
}

export function hasEffect(effects: Effect[], name: string): boolean {
  return effects.some(e => e.name === name && e.duration > 0);
}

export function tickEffects(effects: Effect[]): { effects: Effect[]; playerBurnDmg: number; enemyBurnDmg: number } {
  let playerBurnDmg = 0;
  let enemyBurnDmg = 0;
  const next = effects
    .map(e => {
      if (e.name === 'burn' || e.name === 'poison') {
        const val = e.value ?? (e.name === 'burn' ? 5 : 4);
        if (e.target === 'enemy') enemyBurnDmg += val;
        else playerBurnDmg += val;
      }
      return { ...e, duration: e.duration - 1 };
    })
    .filter(e => e.duration > 0);
  return { effects: next, playerBurnDmg, enemyBurnDmg };
}

export function addEffect(effects: Effect[], name: string, duration: number, value?: number, target?: 'player' | 'enemy'): Effect[] {
  const idx = effects.findIndex(e => e.name === name && (e.target ?? null) === (target ?? null));
  if (idx >= 0) {
    effects[idx].duration = Math.max(effects[idx].duration, duration);
    if (value !== undefined) effects[idx].value = value;
    if (target !== undefined) effects[idx].target = target;
  } else {
    effects.push({ name, duration, value, target });
  }
  return effects;
}
