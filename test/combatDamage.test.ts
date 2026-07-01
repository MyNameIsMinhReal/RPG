import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as format from '../src/utils/format';
import { calcDamage } from '../src/systems/combat/actions';

describe('calcDamage', () => {
  beforeEach(() => {
    vi.spyOn(format, 'randInt').mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns at least 1 damage', () => {
    expect(calcDamage(1, 999)).toBeGreaterThanOrEqual(1);
  });

  it('applies def mitigation: atk*50/(def+50)', () => {
    // atk=100, def=50 → base = round(100*50/100) = 50; variance 0 with mocked randInt
    expect(calcDamage(100, 50)).toBe(50);
  });

  it('deals more damage when target has lower def', () => {
    const vsHighDef = calcDamage(40, 80);
    const vsLowDef = calcDamage(40, 10);
    expect(vsLowDef).toBeGreaterThan(vsHighDef);
  });
});
