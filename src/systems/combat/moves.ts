import type { CombatState } from '../../utils/embeds';
import type { ActionResult } from './actions';

export type CombatMoveType = 'attack' | 'skill' | 'defend' | 'flee' | 'item' | 'ignite';

export type CombatMove =
  | { type: 'attack'; targetIdx?: number }
  | { type: 'skill'; skillId: string; targetIdx?: number }
  | { type: 'defend' }
  | { type: 'flee' }
  | { type: 'item'; itemId: string }
  | { type: 'ignite' };

export interface CombatMoveContext {
  state: CombatState;
  playerAtk: number;
  hpRegen?: number;
  mpRegen?: number;
}

export type CombatMoveHandler<TMove extends CombatMove = CombatMove> = (
  context: CombatMoveContext,
  move: TMove,
) => ActionResult;

export type CombatMoveHandlerMap = {
  [K in CombatMoveType]: CombatMoveHandler<Extract<CombatMove, { type: K }>>;
};
