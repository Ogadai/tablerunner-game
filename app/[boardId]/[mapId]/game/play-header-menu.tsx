'use client'
import Swal from 'sweetalert2'
import { getSwalDefaultOptions } from '@/app/swal';

import { DropdownMenu } from "radix-ui";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import "material-symbols/outlined.css"; // Options: outlined, rounded, or sharp
import { HamburgerMenuIcon } from "@radix-ui/react-icons";
import styles from "./play-header-menu.module.css";

import { deleteGameState, getBoardSettings, setBoardSettings } from "@/lib/store/gameState";
import { saveGameToBlob } from '@/lib/store/saveGameBlobs';
import { storeBoardDefaultSettings, type GameState, type PlayerSnapshot } from "@/lib/store/types";
import gameStateLightingService from './game-state-lighting-service';
import TeamSelectionContent from './race-of-fire/team-selection-content';

const subscribeFullscreen = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
};

const getFullscreenState = () => document.fullscreenElement
  ? 'fullscreen' : document.fullscreenEnabled ? 'normal' : 'unavailable';
const getServerFullscreenState = () => 'unavailable';

export default function PlayHeaderMenu(  { boardId, mapId, gameState, snapshot, onSnapshotChange }
  : {
    boardId: string;
    mapId: string;
    gameState?: GameState;
    snapshot?: PlayerSnapshot;
    onSnapshotChange?: (snapshot: PlayerSnapshot) => void;
  }
) {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<'settings' | 'team' | null>(null);
  const settingsOpen = activeDialog === 'settings';
  const isRaceOfFire = gameState?.gameId === 'racefire';
  const fullscreenState = useSyncExternalStore(subscribeFullscreen, getFullscreenState, getServerFullscreenState);
  const isFullscreen = fullscreenState === 'fullscreen';
  const [brightness, setBrightness] = useState(storeBoardDefaultSettings.brightness);
  const brightnessChangeTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const toggleFullscreenAction = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Unable to change fullscreen mode',
        icon: 'error',
      });
    }
  };

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

  const saveGameAction = async () => {
    const result = await Swal.fire({
      ...getSwalDefaultOptions(),
      title: 'Save Game',
      input: 'text',
      inputPlaceholder: 'Enter a name for this save',
      showCancelButton: true,
      confirmButtonText: 'Save',
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      allowEscapeKey: () => !Swal.isLoading(),
      inputValidator: value => value.trim() ? undefined : 'Please enter a save name.',
      preConfirm: async (saveName: string) => {
        try {
          const response = await saveGameToBlob(boardId, mapId, saveName.trim());
          if (!response.success) {
            Swal.showValidationMessage('Unable to save the game. Please try again.');
            return false;
          }
          return true;
        } catch {
          Swal.showValidationMessage('Unable to save the game. Please try again.');
          return false;
        }
      },
    });

    if (result.isConfirmed) {
      await Swal.fire({
        ...getSwalDefaultOptions(),
        title: 'Game saved',
        icon: 'success',
      });
    }
  };

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

  const loadGameAction = async () => {
    router.push(`/${boardId}/${mapId}/load`);
  }

  return (
    <Dialog.Root open={settingsOpen || (activeDialog === 'team' && isRaceOfFire && !!snapshot)} onOpenChange={open => {
      if (!open) setActiveDialog(null);
    }}>
      <DropdownMenu.Root>
			<DropdownMenu.Trigger asChild>
				<button className={`${styles.IconButton}`} aria-label="Settings">
					<HamburgerMenuIcon />
				</button>
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content className={styles.Content} sideOffset={5}>
          <DropdownMenu.Item className={styles.Item} disabled={fullscreenState === 'unavailable'} onSelect={() => { void toggleFullscreenAction(); }}>
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'} <div className={`${styles.RightSlot} material-symbols-outlined`}>{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</div>
          </DropdownMenu.Item>
					<DropdownMenu.Item className={styles.Item} onClick={characterListAction}>
						Player List <div className={`${styles.RightSlot} material-symbols-outlined`}>group</div>
					</DropdownMenu.Item>
          {isRaceOfFire && (
            <DropdownMenu.Item className={styles.Item} disabled={!snapshot || !onSnapshotChange} onSelect={() => setActiveDialog('team')}>
              Choose Team <div className={`${styles.RightSlot} material-symbols-outlined`}>groups</div>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item className={styles.Item} onClick={() => setActiveDialog('settings')}>
            Board Settings <div className={`${styles.RightSlot} material-symbols-outlined`}>settings</div>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.Separator} />

          <DropdownMenu.Item className={styles.Item} onSelect={() => {
            // Let the menu close and restore focus before opening the prompt.
            setTimeout(() => { void saveGameAction(); }, 0);
          }}>
            Save Game <div className={`${styles.RightSlot} material-symbols-outlined`}>backup</div>
          </DropdownMenu.Item>
					<DropdownMenu.Item className={styles.Item} onClick={loadGameAction}>
						Load Game <div className={`${styles.RightSlot} material-symbols-outlined`}>cloud_download</div>
					</DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.Separator} />

					<DropdownMenu.Item className={styles.Item} onClick={deleteGameAction}>
						Delete Game <div className={`${styles.RightSlot} ${styles.deleteIcon} material-symbols-outlined`}>delete_forever</div>
					</DropdownMenu.Item>
          <DropdownMenu.Arrow className={styles.Arrow} />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <Dialog.Portal>
          <Dialog.Overlay className="DialogOverlay" />
          <Dialog.Content className={`DialogContent ${styles.settingsDialog} ${activeDialog === 'team' ? styles.teamDialog : ''}`}>
            {activeDialog === 'team' && snapshot && onSnapshotChange ? <>
              <Dialog.Title className="DialogTitle">Race of Fire Team</Dialog.Title>
              <TeamSelectionContent
                boardId={boardId}
                mapId={mapId}
                snapshot={snapshot}
                onSnapshotChange={onSnapshotChange}
              />
            </> : <>
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
            </>}
          </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
