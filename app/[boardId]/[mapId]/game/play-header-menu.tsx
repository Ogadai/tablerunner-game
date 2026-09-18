'use client'
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { DropdownMenu } from "radix-ui";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import "material-symbols/outlined.css"; // Options: outlined, rounded, or sharp
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import styles from "./play-header-menu.module.css";

import { deleteGameState, getBoardSettings, setBoardSettings } from "@/lib/store/gameState";
import { storeBoardDefaultSettings } from "@/lib/store/types";
import gameStateLightingService from './game-state-lighting-service';

export default function PlayHeaderMenu(  { boardId, mapId }
  : { boardId: string, mapId: string }
) {
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brightness, setBrightness] = useState(storeBoardDefaultSettings.brightness);
  const brightnessChangeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (settingsOpen) {
      getBoardSettings(boardId, mapId).then(result => {
        if (result.success && result.data) {
          setBrightness(result.data.brightness);
        }
      });
    }
  }, [boardId, mapId, settingsOpen]);

  const applyBrightnessChange = async (value: number) => {
    await Promise.all([
      setBoardSettings(boardId, mapId, { brightness: value }),
      gameStateLightingService.applySettings({ brightness: value }),
    ]);
  };

  const brightnessChangeAction = (value: number) => {
    setBrightness(value);
    if (brightnessChangeTimeout.current) {
      clearTimeout(brightnessChangeTimeout.current);
    }

    brightnessChangeTimeout.current = setTimeout(() => {
      void applyBrightnessChange(value);
    }, 300);
  };

  useEffect(() => () => {
    if (brightnessChangeTimeout.current) {
      clearTimeout(brightnessChangeTimeout.current);
    }
  }, []);

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
    <Dialog.Root open={settingsOpen} onOpenChange={setSettingsOpen}>
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
          <DropdownMenu.Item className={styles.Item} onClick={() => setSettingsOpen(true)}>
            Board Settings <div className={`${styles.RightSlot} material-symbols-outlined`}>settings</div>
          </DropdownMenu.Item>
					<DropdownMenu.Item className={styles.Item} onClick={deleteGameAction}>
						Delete Game <div className={`${styles.RightSlot} ${styles.deleteIcon} material-symbols-outlined`}>delete_forever</div>
					</DropdownMenu.Item>
          <DropdownMenu.Arrow className={styles.Arrow} />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className={`DialogContent ${styles.settingsDialog}`}>
            <Dialog.Title className="DialogTitle">Settings</Dialog.Title>
            <div className={styles.brightnessRow}>
              <label htmlFor="board-brightness">Brightness</label>
              <output htmlFor="board-brightness">{brightness}</output>
            </div>
            <input
              id="board-brightness"
              type="range"
              min="10"
              max="200"
              value={brightness}
              onChange={event => brightnessChangeAction(Number(event.target.value))}
            />
          </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
