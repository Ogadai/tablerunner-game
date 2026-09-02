import { Popover } from 'radix-ui';

import  EntityList, { EntityItemDetail } from './entity-list';
import { useState } from 'react';

export default function AttackPickTarget({
  entities,
  onAttackTarget
}: {
  entities: EntityItemDetail[],
  onAttackTarget?: (entity: EntityItemDetail) => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  const attackAction = (entity: EntityItemDetail) => {
    onAttackTarget?.(entity);
    setIsOpen(false);
  }

  const bindAttackAction = (entity: EntityItemDetail) => () => attackAction(entity);

  return (
    <>
      { entities.length == 1 &&
        <button type="button" className="btn" onClick={bindAttackAction(entities[0])}>Attack</button>
      }
      { entities.length > 1 &&
        <Popover.Root modal={true} open={isOpen} onOpenChange={setIsOpen}>
          <Popover.Trigger asChild>
            <button className="btn">Attack</button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content className="PopoverContent" sideOffset={5}>
              <EntityList entities={entities} onClickEntity={attackAction} />
            <Popover.Arrow className="PopoverArrow" width={15} height={10} />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      }
    </>
  );
}
