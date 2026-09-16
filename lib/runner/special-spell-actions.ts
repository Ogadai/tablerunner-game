import { monsters } from "../games/monsters";
import { SpellIds } from "../games/spells";
import { SpellDef } from "../games/types";
import { CharacterEffect, INamedTarget, ITarget, MonsterState, PlayerState } from "../store/types";
import { BaseParams } from "./base-params";
import { playerMessageAtLocation } from "./game-messages";

export const specialSpellActions: Record<string, (params: BaseParams, player: INamedTarget, spell: SpellDef, targets: ITarget[]) => void> = {
};
