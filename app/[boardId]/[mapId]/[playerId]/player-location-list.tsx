import { useState, useEffect } from "react";
import { Dialog } from "radix-ui";
import { monsters } from '@/lib/games/monsters';
import { characters } from '@/lib/games/characters';
import { MonsterState, PlayerAction, PlayerActionAttack, PlayerActionsState, PlayerActionType, PlayerActionUseItem, PlayerState } from '@/lib/store/types';
import EntityList, { EntityItemDetail, EntityItemClass } from './entity-list';
import MonsterCard from './monster-card';
import CharacterCard from './character-card';
import { PlayerActionsPerTurn } from "@/lib/store/playerStats";
import { allItems } from "@/lib/games/items";
import { PlayerItem } from "@/lib/games/types";

export interface PlayerLocationListProps {
  boardId: string;
  mapId: string;
  player: PlayerState;
  otherPlayers: PlayerState[];
  monsters: MonsterState[];
  actionsState: PlayerActionsState;
  actionsPerTurn: PlayerActionsPerTurn;
  actionPointsLeft: number;
  addNewAction: (opts: Omit<PlayerAction, 'id'>) => Promise<void>;
}

export default function PlayerLocationList({
  boardId,
  mapId,
  player,
  otherPlayers,
  monsters: locationMonsters,
  actionsState,
  actionsPerTurn,
  actionPointsLeft,
  addNewAction
}: PlayerLocationListProps) {
  const [monsterOpen, setMonsterOpen] = useState<MonsterState | null>(null);
  const [characterOpen, setCharacterOpen] = useState<PlayerState | null>(null);

  const entities: EntityItemDetail[] = [
    {
      id: player.id,
      name: player.name,
      icon: characters[player.id].icon,
      className: EntityItemClass.self,
      health: player.health,
      maxHealth: player.baseStats?.health || player.health
    },
    ...otherPlayers.map(otherPlayer => ({
      id: otherPlayer.id,
      name: otherPlayer.name,
      icon: characters[otherPlayer.id].icon,
      className: EntityItemClass.friendly,
      health: otherPlayer.health,
      maxHealth: otherPlayer.baseStats?.health || otherPlayer.health
    })),
    ...locationMonsters.map(monster => ({
      id: monster.id,
      name: monsters[monster.type].name,
      icon: monsters[monster.type].icon,
      className: EntityItemClass.enemy,
      health: monster.health,
      maxHealth: monsters[monster.type].baseStats.health
    }))
  ];

  useEffect(() => {
    // Listen for the custom Swal signal
    window.addEventListener('close-active-radix-dialogs', onCloseDialog);
    return () => {
      window.removeEventListener('close-active-radix-dialogs', onCloseDialog);
    };
  });

  useEffect(() => {
    if (player.availableStats > 0) {
      setCharacterOpen(player);
    }
  }, [player]);
  
  const onClickEntity = async (entity: EntityItemDetail) => {
    if (entity.className === EntityItemClass.enemy) {
      const monster = locationMonsters.find(m => m.id === entity.id)!;
      setMonsterOpen(monster);
    } else if (player.id === entity.id) {
      setCharacterOpen(player);
    } else {
      setCharacterOpen(otherPlayers.find(p => p.id === entity.id)!);
    }
  }

  const onAttackMonster = async (monster: MonsterState) => {
    setMonsterOpen(null);

    await addNewAction({
      type: PlayerActionType.Attack,
      description: `Attack ${monsters[monster.type].name}`,
      target: monster.id
    } as Omit<PlayerActionAttack, 'id'>);
  }

  const onUseItem = async (id: string, uniqueId?: string) => {
    setCharacterOpen(null);
    const item: PlayerItem = (allItems as any)[id];

    await addNewAction({
      type: PlayerActionType.UseItem,
      description: `Use ${item.name}`,
      itemId: id,
      uniqueId
    } as Omit<PlayerActionUseItem, 'id'>);
  }

  const dialogOpen = (monsterOpen !== null) || (characterOpen !== null);
  
  const dialogTitle =  (monsterOpen !== null)
    ? monsters[monsterOpen.type].name
    : (characterOpen !== null) ? characterOpen.name : '';
  const dialogSubTitle = (characterOpen !== null) ? `Level ${characterOpen.level}` : null;

  const onCloseDialog = () => {
    setMonsterOpen(null);
    setCharacterOpen(null);
  }

  const canAttack = actionPointsLeft >= actionsPerTurn.attack;
  const usedItemUniqueIds = actionsState.actions
    .filter(a => a.type === PlayerActionType.UseItem)
    .map(a => (a as PlayerActionUseItem).uniqueId);

  return (<>
    <EntityList entities={entities} onClickEntity={onClickEntity} />

    <Dialog.Root open={dialogOpen} onOpenChange={open => { if (!open) onCloseDialog() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">
            <span>{dialogTitle}</span>
            { dialogSubTitle && <span className="DialogSubTitle">{dialogSubTitle}</span> }
            </Dialog.Title>
          <div className="DialogContentBody">
            { monsterOpen &&
              <MonsterCard
                monster={monsterOpen}
                canAttack={canAttack}
                onAttack={() => onAttackMonster(monsterOpen)}
              ></MonsterCard>
            }
            { characterOpen &&
              <CharacterCard
                boardId={boardId}
                mapId={mapId}
                player={characterOpen}
                isSelf={characterOpen.id === player.id}
                actionPointsLeft={actionPointsLeft}
                onUseItem={onUseItem}
                usedItemUniqueIds={usedItemUniqueIds}
              ></CharacterCard>
            }
          </div>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">close</Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </>);
}
