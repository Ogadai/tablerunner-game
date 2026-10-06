import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Swal, { type SweetAlertOptions } from 'sweetalert2';
import { deleteGameState, getBoardSettings, setBoardSettings } from '@/lib/store/gameState';
import { saveGameToBlob } from '@/lib/store/saveGameBlobs';
import { storeBoardDefaultSettings } from '@/lib/store/types';
import gameStateLightingService from './game-state-lighting-service';
import PlayHeaderMenu from './play-header-menu';
import { makeGameState, makePlayerSnapshot } from './test-fixtures';
import { setPlayerRaceTeam } from '@/lib/runner/race-of-fire/server-actions';

jest.mock('@/lib/runner/race-of-fire/server-actions', () => ({ setPlayerRaceTeam: jest.fn() }));

jest.mock('next/navigation', () => ({ useRouter: jest.fn() }));
jest.mock('sweetalert2', () => ({ __esModule: true, default: { fire: jest.fn(), isLoading: jest.fn(), showValidationMessage: jest.fn() } }));
jest.mock('@/app/swal', () => ({ getSwalDefaultOptions: () => ({}) }));
jest.mock('@/lib/store/gameState', () => ({ deleteGameState: jest.fn(), getBoardSettings: jest.fn(), setBoardSettings: jest.fn() }));
jest.mock('@/lib/store/saveGameBlobs', () => ({ saveGameToBlob: jest.fn() }));
jest.mock('./game-state-lighting-service', () => ({ __esModule: true, default: { applySettings: jest.fn() } }));

describe('PlayHeaderMenu', () => {
  const originalResizeObserver = global.ResizeObserver;
  beforeAll(() => {
    // Radix observes popup dimensions; jsdom does not implement layout observers.
    global.ResizeObserver = jest.fn().mockImplementation(() => ({ observe: jest.fn(), unobserve: jest.fn(), disconnect: jest.fn() }));
  });
  afterAll(() => { global.ResizeObserver = originalResizeObserver; });
  const push = jest.fn();
  const mount = () => render(<PlayHeaderMenu boardId="board" mapId="map" />);
  const select = async (name: RegExp) => {
    fireEvent.keyDown(screen.getByRole('button', { name: 'Settings' }), { key: 'ArrowDown' });
    await act(async () => fireEvent.click(screen.getByRole('menuitem', { name })));
  };
  const advance = async (ms: number) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
  const saveOptions = () => jest.mocked(Swal.fire).mock.calls[0][0] as SweetAlertOptions;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useRouter).mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
    jest.mocked(Swal.fire).mockResolvedValue({ isConfirmed: false, isDenied: false, isDismissed: true });
    jest.mocked(getBoardSettings).mockResolvedValue({ success: true, data: { brightness: 75 } });
    jest.mocked(Swal.isLoading).mockReturnValue(false);
  });
  afterEach(() => jest.useRealTimers());

  describe('team selection', () => {
    const race = makeGameState({ gameId: 'racefire' });

    it.each(['racefire', 'game-1'])('only shows Choose Team for Race of Fire (%s)', gameId => {
      render(<PlayHeaderMenu boardId="board" mapId="map" gameState={makeGameState({ gameId })} />);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Settings' }), { key: 'ArrowDown' });
      if (gameId === 'racefire') {
        expect(screen.getByRole('menuitem', { name: /Choose Team/ })).toBeInTheDocument();
      } else {
        expect(screen.queryByRole('menuitem', { name: /Choose Team/ })).not.toBeInTheDocument();
      }
    });

    it('disables team selection without a player snapshot', () => {
      render(<PlayHeaderMenu boardId="board" mapId="map" gameState={race} onSnapshotChange={jest.fn()} />);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Settings' }), { key: 'ArrowDown' });
      expect(screen.getByRole('menuitem', { name: /Choose Team/ })).toHaveAttribute('aria-disabled', 'true');
    });

    it.each(['click', 'keyboard'])('opens the selector via %s, saves and closes the popup', async interaction => {
      const snapshot = makePlayerSnapshot({ gameState: race });
      const onSnapshotChange = jest.fn();
      jest.mocked(setPlayerRaceTeam).mockResolvedValue({ success: true, data: { team: 'blue' } });
      const props = { boardId: 'board', mapId: 'map', gameState: race, snapshot, onSnapshotChange };
      const view = render(<PlayHeaderMenu {...props} />);
      fireEvent.keyDown(screen.getByRole('button', { name: 'Settings' }), { key: 'ArrowDown' });
      await act(async () => {
        const item = screen.getByRole('menuitem', { name: /Choose Team/ });
        if (interaction === 'keyboard') fireEvent.keyDown(item, { key: 'Enter' });
        else fireEvent.click(item);
      });
      expect(screen.getByRole('dialog', { name: 'Race of Fire Team' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'No team' })).toHaveAttribute('aria-pressed', 'true');
      expect(getBoardSettings).not.toHaveBeenCalled();
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Blue team' })));
      const updated = { ...snapshot, instructions: { team: 'blue' } };
      expect(onSnapshotChange).toHaveBeenCalledWith(updated);
      view.rerender(<PlayHeaderMenu {...props} snapshot={updated} />);
      expect(screen.getByRole('button', { name: 'Blue team' })).toHaveAttribute('aria-pressed', 'true');
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('fullscreen toggle', () => {
    let fullscreenElement: Element | null;
    let fullscreenEnabled: boolean;
    const requestFullscreen = jest.fn<Promise<void>, []>();
    const exitFullscreen = jest.fn<Promise<void>, []>();
    const fullscreenProperties = [
      { target: document, key: 'fullscreenElement' },
      { target: document, key: 'fullscreenEnabled' },
      { target: document, key: 'exitFullscreen' },
      { target: document.documentElement, key: 'requestFullscreen' },
    ].map(property => ({ ...property, original: Object.getOwnPropertyDescriptor(property.target, property.key) }));
    const openMenu = () => fireEvent.keyDown(screen.getByRole('button', { name: 'Settings' }), { key: 'ArrowDown' });
    const fullscreenItem = () => screen.getByRole('menuitem', { name: /^Full Screen/ });
    const exitFullscreenItem = () => screen.getByRole('menuitem', { name: /^Exit Full Screen/ });
    const changeFullscreen = (element: Element | null) => {
      fullscreenElement = element;
      document.dispatchEvent(new Event('fullscreenchange'));
    };

    beforeEach(() => {
      fullscreenElement = null;
      fullscreenEnabled = true;
      Object.defineProperties(document, {
        fullscreenElement: { configurable: true, get: () => fullscreenElement },
        fullscreenEnabled: { configurable: true, get: () => fullscreenEnabled },
        exitFullscreen: { configurable: true, value: exitFullscreen },
      });
      Object.defineProperty(document.documentElement, 'requestFullscreen', { configurable: true, value: requestFullscreen });
      requestFullscreen.mockReset().mockImplementation(async () => { changeFullscreen(document.documentElement); });
      exitFullscreen.mockReset().mockImplementation(async () => { changeFullscreen(null); });
    });

    afterEach(() => {
      for (const { target, key, original } of fullscreenProperties) {
        if (original) Object.defineProperty(target, key, original);
        else Reflect.deleteProperty(target, key);
      }
    });

    it.each(['click', 'keyboard'])('enters fullscreen via %s and offers to exit', async interaction => {
      mount();
      openMenu();
      expect(fullscreenItem()).not.toHaveAttribute('aria-disabled', 'true');
      await act(async () => {
        if (interaction === 'keyboard') fireEvent.keyDown(fullscreenItem(), { key: 'Enter' });
        else fireEvent.click(fullscreenItem());
      });
      expect(requestFullscreen).toHaveBeenCalledTimes(1);
      expect(requestFullscreen.mock.contexts[0]).toBe(document.documentElement);
      expect(exitFullscreen).not.toHaveBeenCalled();
      openMenu();
      expect(exitFullscreenItem()).toBeInTheDocument();
      expect(exitFullscreenItem()).toHaveTextContent('fullscreen_exit');
    });

    it('exits an existing fullscreen session and offers to enter again', async () => {
      fullscreenElement = document.documentElement;
      mount();
      await select(/^Exit Full Screen/);
      expect(exitFullscreen).toHaveBeenCalledTimes(1);
      expect(requestFullscreen).not.toHaveBeenCalled();
      openMenu();
      expect(fullscreenItem()).toBeInTheDocument();
      expect(fullscreenItem()).toHaveTextContent('fullscreen');
    });

    it('updates the open menu when fullscreen changes externally, including Escape exits', () => {
      mount();
      openMenu();
      act(() => changeFullscreen(document.documentElement));
      expect(exitFullscreenItem()).toBeInTheDocument();
      // Browsers emit fullscreenchange after Escape exits fullscreen.
      act(() => changeFullscreen(null));
      expect(fullscreenItem()).toBeInTheDocument();
      expect(requestFullscreen).not.toHaveBeenCalled();
      expect(exitFullscreen).not.toHaveBeenCalled();
    });

    it('disables fullscreen when the browser does not support it', async () => {
      fullscreenEnabled = false;
      mount();
      openMenu();
      expect(fullscreenItem()).toHaveAttribute('aria-disabled', 'true');
      await act(async () => fireEvent.click(fullscreenItem()));
      expect(requestFullscreen).not.toHaveBeenCalled();
      expect(exitFullscreen).not.toHaveBeenCalled();
      expect(Swal.fire).not.toHaveBeenCalled();
    });

    it.each(['enter', 'exit'])('shows an error and preserves the menu state when %s fails', async action => {
      if (action === 'enter') requestFullscreen.mockRejectedValue(new Error('Fullscreen denied'));
      else {
        fullscreenElement = document.documentElement;
        exitFullscreen.mockRejectedValue(new Error('Exit failed'));
      }
      mount();
      await select(action === 'enter' ? /^Full Screen/ : /^Exit Full Screen/);
      expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Unable to change fullscreen mode', icon: 'error',
      }));
      openMenu();
      expect(action === 'enter' ? fullscreenItem() : exitFullscreenItem()).toBeInTheDocument();
    });
  });

  it.each([[/Player List/, '/board/map'], [/Load Game/, '/board/map/load']] as const)('navigates from %s', async (label, path) => {
    mount();
    await select(label);
    expect(push).toHaveBeenCalledWith(path);
  });

  it.each([true, false])('resets and navigates only after confirmation (%s)', async isConfirmed => {
    jest.mocked(Swal.fire).mockResolvedValue({ isConfirmed, isDenied: false, isDismissed: !isConfirmed });
    mount();
    await select(/Delete Game/);
    expect(Swal.fire).toHaveBeenCalledWith(expect.objectContaining({ title: 'Reset game?', showCancelButton: true }));
    if (isConfirmed) {
      expect(deleteGameState).toHaveBeenCalledWith('board', 'map');
      expect(push).toHaveBeenCalledWith('/board/map');
    } else {
      expect(deleteGameState).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    }
  });

  it('loads settings on demand and debounces persistence and hardware updates', async () => {
    mount();
    expect(getBoardSettings).not.toHaveBeenCalled();
    await select(/Board Settings/);
    expect(getBoardSettings).toHaveBeenCalledWith('board', 'map');
    const slider = screen.getByRole('slider', { name: 'Brightness' });
    expect(slider).toHaveValue('75');
    fireEvent.change(slider, { target: { value: '100' } });
    await advance(200);
    fireEvent.change(slider, { target: { value: '150' } });
    expect(slider).toHaveValue('150');
    await advance(299);
    expect(setBoardSettings).not.toHaveBeenCalled();
    expect(gameStateLightingService.applySettings).not.toHaveBeenCalled();
    await advance(1);
    expect(setBoardSettings).toHaveBeenCalledTimes(1);
    expect(setBoardSettings).toHaveBeenCalledWith('board', 'map', { brightness: 150 });
    expect(gameStateLightingService.applySettings).toHaveBeenCalledWith({ brightness: 150 });
  });

  it('keeps default brightness if settings cannot be loaded', async () => {
    jest.mocked(getBoardSettings).mockResolvedValue({ success: false });
    mount();
    await select(/Board Settings/);
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue(String(storeBoardDefaultSettings.brightness));
  });

  it('cancels pending brightness writes on unmount', async () => {
    const view = mount();
    await select(/Board Settings/);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '100' } });
    view.unmount();
    await advance(300);
    expect(setBoardSettings).not.toHaveBeenCalled();
    expect(gameStateLightingService.applySettings).not.toHaveBeenCalled();
  });

  it('defers the save prompt until the menu closes and does nothing on cancellation', async () => {
    mount();
    await select(/Save Game/);
    expect(Swal.fire).not.toHaveBeenCalled();
    await advance(0);
    expect(Swal.fire).toHaveBeenCalledTimes(1);
    expect(saveOptions()).toEqual(expect.objectContaining({ title: 'Save Game', showCancelButton: true }));
    expect(saveGameToBlob).not.toHaveBeenCalled();
  });

  it('validates the save name, trims it and prevents dismissal while saving', async () => {
    jest.mocked(saveGameToBlob).mockResolvedValue({ success: true });
    mount();
    await select(/Save Game/);
    await advance(0);
    const options = saveOptions();
    const validate = options.inputValidator as (value: string) => string | undefined;
    expect(validate('   ')).toBe('Please enter a save name.');
    expect(validate(' Adventure ')).toBeUndefined();
    expect(await options.preConfirm!(' Adventure ')).toBe(true);
    expect(saveGameToBlob).toHaveBeenCalledWith('board', 'map', 'Adventure');
    const outside = options.allowOutsideClick as () => boolean;
    const escape = options.allowEscapeKey as () => boolean;
    expect(outside()).toBe(true);
    expect(escape()).toBe(true);
    jest.mocked(Swal.isLoading).mockReturnValue(true);
    expect(outside()).toBe(false);
    expect(escape()).toBe(false);
  });

  it.each(['unsuccessful', 'rejected'])('shows validation feedback for an %s save', async failure => {
    if (failure === 'rejected') jest.mocked(saveGameToBlob).mockRejectedValue(new Error('offline'));
    else jest.mocked(saveGameToBlob).mockResolvedValue({ success: false });
    mount();
    await select(/Save Game/);
    await advance(0);
    expect(await saveOptions().preConfirm!('Adventure')).toBe(false);
    expect(Swal.showValidationMessage).toHaveBeenCalledWith('Unable to save the game. Please try again.');
  });

  it('shows a success notification after the save is confirmed', async () => {
    jest.mocked(Swal.fire).mockResolvedValueOnce({ isConfirmed: true, isDenied: false, isDismissed: false });
    mount();
    await select(/Save Game/);
    await advance(0);
    expect(Swal.fire).toHaveBeenNthCalledWith(2, expect.objectContaining({ title: 'Game saved', icon: 'success' }));
  });
});
