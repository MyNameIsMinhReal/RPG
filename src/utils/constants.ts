// Central tunables. Gather rates, time windows, balance multipliers and any
// "magic number" that more than one system cares about should live here so a
// future rebalance / weekend event touches one file instead of dozens.

// ── Time ──────────────────────────────────────────────────────────────────
/** Seconds in one day. */
export const DAY_SECONDS = 86_400;

/**
 * Server timezone offset (hours from UTC) used for in-game time-of-day.
 * Defaults to UTC+7 (Vietnam) but can be overridden via env without code edits.
 */
export const TIMEZONE_OFFSET = Number(process.env.TIMEZONE_OFFSET ?? 7);

// ── Gather ────────────────────────────────────────────────────────────────
export const GATHER_COOLDOWN_MS = 60_000;

// ── Combat balance ─────────────────────────────────────────────────────────
/** Multiplier applied to each target hit by an AoE skill (single-target keeps full power). */
export const AOE_SKILL_PENALTY = 0.75;

/**
 * Default skill scaling when a skill has no explicit atkScale.
 * Effective raw = damage * BASE_RETAIN + playerAtk * (damage / ATK_DIVISOR),
 * tuned so a low-level caster (~ATK 15) deals roughly the old flat number while
 * the same skill keeps scaling with ATK/gear into late-game.
 */
export const SKILL_BASE_RETAIN = 0.5;
export const SKILL_ATK_DIVISOR = 30;
/** Default heal scaling: heal * BASE_RETAIN + maxHp * (heal / HEAL_MAXHP_DIVISOR). */
export const HEAL_MAXHP_DIVISOR = 240;
