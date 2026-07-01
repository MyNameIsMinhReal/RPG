import { processAttack, processDefend, processFlee, processIgnite, processItemUse, processSkill } from './actions';
import type { CombatMoveHandlerMap } from './moves';

export const combatMoveHandlers: CombatMoveHandlerMap = {
  attack: (context, move) => processAttack(context.state, context.playerAtk, move.targetIdx ?? 0),
  skill: (context, move) => processSkill(
    context.state,
    move.skillId,
    context.playerAtk,
    context.hpRegen ?? 0,
    context.mpRegen ?? 0,
    move.targetIdx ?? 0,
  ),
  defend: (context) => processDefend(context.state, context.playerAtk, context.hpRegen ?? 0, context.mpRegen ?? 0),
  flee: (context) => processFlee(context.state),
  item: (context, move) => processItemUse(context.state, move.itemId),
  ignite: (context) => processIgnite(context.state),
};
