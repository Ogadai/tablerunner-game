'use client'
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { DropdownMenu } from "radix-ui";
import { useRouter } from 'next/navigation';
import "material-symbols/outlined.css"; // Options: outlined, rounded, or sharp
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import styles from "./play-header-menu.module.css";

import { deleteGameState } from "@/lib/store/gameState";

export default function PlayHeaderMenu(  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const router = useRouter();

  const deleteGameAction = async () => {
    const result = await Swal.fire({
      ...getSwalDefaultOptions(),
      title: 'Reset game?',
      icon: 'warning',
      text: "This will delete your current game and start a new game. This action cannot be undone!",
      showCancelButton: true,
      confirmButtonColor: 'var(--color-error)',
      confirmButtonText: 'Delete!'
    })

    if (result.isConfirmed) {
      await deleteGameState(boardId, mapId);
      router.push(`/${boardId}/${mapId}`);
    }
  };

  const characterListAction = async () => {
    router.push(`/${boardId}/${mapId}`);
  }

  return (
    <DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button className={`${styles.IconButton}`} aria-label="Settings">
					<HamburgerMenuIcon />
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content className={styles.Content} sideOffset={5}>
					<DropdownMenu.Item className={styles.Item} onClick={characterListAction}>
						Player List <div className={`${styles.RightSlot} material-symbols-outlined`}>group</div>
					</DropdownMenu.Item>
					<DropdownMenu.Item className={styles.Item} onClick={deleteGameAction}>
						Delete Game <div className={`${styles.RightSlot} ${styles.deleteIcon} material-symbols-outlined`}>delete_forever</div>
					</DropdownMenu.Item>
          <DropdownMenu.Arrow className={styles.Arrow} />
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
  );
}
