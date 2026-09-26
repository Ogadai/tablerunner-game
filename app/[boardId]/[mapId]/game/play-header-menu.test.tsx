import { act, fireEvent, render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Swal, { type SweetAlertOptions } from 'sweetalert2';
import { deleteGameState, getBoardSettings, setBoardSettings } from '@/lib/store/gameState';
import { saveGameToBlob } from '@/lib/store/saveGameBlobs';
import { storeBoardDefaultSettings } from '@/lib/store/types';
import gameStateLightingService from './game-state-lighting-service';
import PlayHeaderMenu from './play-header-menu';

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
