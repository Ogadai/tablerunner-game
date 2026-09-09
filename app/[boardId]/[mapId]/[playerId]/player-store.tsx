'use client';

import { Dialog } from 'radix-ui';

export default function PlayerStore() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button">Store</button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="DialogOverlay" />
        <Dialog.Content className="DialogContent">
          <Dialog.Title className="DialogTitle">Store</Dialog.Title>
          <Dialog.Close className="DialogClose btn-secondary material-symbols-outlined" aria-label="Close">
            close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
