import { combatMoveHandlers } from './handlers';
import type { ActionResult } from './actions';
import type { CombatMove, CombatMoveHandlerMap, CombatMoveContext } from './moves';

export function resolveCombatMove(
  move: CombatMove,
  context: CombatMoveContext,
  handlers: CombatMoveHandlerMap = combatMoveHandlers,
): ActionResult {
  switch (move.type) {
    case 'attack':
      return handlers.attack(context, move);
    case 'skill':
      return handlers.skill(context, move);
    case 'defend':
      return handlers.defend(context, move);
    case 'flee':
      return handlers.flee(context, move);
    case 'item':
      return handlers.item(context, move);
    case 'ignite':
      return handlers.ignite(context, move);
    default: {
      const neverMove: never = move;
      throw new Error(`Unsupported combat move: ${JSON.stringify(neverMove)}`);
    }
  }
}
