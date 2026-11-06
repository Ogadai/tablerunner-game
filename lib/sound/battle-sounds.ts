import { CombatEvent } from '../store/types';

export const REPLAY_SOUND_STORAGE_KEY = 'battle_replay_sound_enabled';

const BASE_URL = process.env.LOCATION_IMAGE_BASE_URL || 'https://eivregtw0c7oknqs.public.blob.vercel-storage.com';

/**
 * Returns the sound file path for a given combat event, or null if no sound is associated.
 * All sound files reside in `/sounds` as .mp3 files.
 */
export function getCombatEventSound(event: CombatEvent | undefined): string | null {
  const relativeUrl = getCombatEventRelativeUrl(event);
  if (!relativeUrl) return null;
  
  return `${BASE_URL}${relativeUrl}`;
}

export function getCombatEventRelativeUrl(event: CombatEvent | undefined): string | null {
  if (!event) return null;

  const actionNameLower = event.actionName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Items - single sound for drinking any potion / consumable
  if (event.actionType === 'item') {
    return '/game-sounds/potion-drink.mp3';
  }

  // 2. Attacks
  if (event.actionType === 'attack') {
    const isRanged =
      (event.icon?.sheet === 'spell' && event.icon.iconXY.x === 0 && event.icon.iconXY.y === 5) ||
      actionNameLower.includes('bow') ||
      actionNameLower.includes('arrow') ||
      actionNameLower.includes('shot') ||
      actionNameLower.includes('ranged');

    if (isRanged) {
      return '/game-sounds/bow-twang.mp3';
    }
    return '/game-sounds/sword-clash.mp3';
  }

  // 3. Spells & Special Barbarian / Ranger Actions
  if (event.actionType === 'spell') {
    switch (actionNameLower) {
      // Barbarian special actions
      case 'rage':
        return '/game-sounds/barbarian-rage.mp3';
      case 'mightycleave':
        return '/game-sounds/barbarian-mighty-cleave.mp3';
      case 'warcry':
        return '/game-sounds/barbarian-war-cry.mp3';
      case 'ironskin':
        return '/game-sounds/barbarian-iron-skin.mp3';
      case 'whirlwind':
        return '/game-sounds/barbarian-whirlwind.mp3';
      case 'bloodthirst':
        return '/game-sounds/barbarian-bloodthirst.mp3';
      case 'berserker':
        return '/game-sounds/barbarian-berserker.mp3';

      // Ranger special actions
      case 'focus':
        return '/game-sounds/ranger-focus.mp3';
      case 'pinningshot':
        return '/game-sounds/ranger-pinning-shot.mp3';
      case 'evasivestep':
        return '/game-sounds/ranger-evasive-step.mp3';
      case 'multishot':
        return '/game-sounds/ranger-multi-shot.mp3';
      case 'poisonarrow':
        return '/game-sounds/ranger-poison-arrow.mp3';
      case 'snipershot':
        return '/game-sounds/ranger-sniper-shot.mp3';
      case 'callcompanion':
        return '/game-sounds/ranger-call-companion.mp3';

      // Spells
      case 'spiritarrow':
        return '/game-sounds/spirit-arrow.mp3';
      case 'fireball':
        return '/game-sounds/fireball.mp3';
      case 'firewall':
        return '/game-sounds/fire-wall.mp3';
      case 'iceshards':
        return '/game-sounds/ice-shards.mp3';
      case 'icestorm':
        return '/game-sounds/ice-storm.mp3';
      case 'heal':
        return '/game-sounds/heal.mp3';
      case 'healingaura':
        return '/game-sounds/healing-aura.mp3';
      case 'fear':
        return '/game-sounds/fear.mp3';
      case 'terror':
        return '/game-sounds/terror.mp3';
      case 'shield':
        return '/game-sounds/shield.mp3';
      case 'shieldwall':
        return '/game-sounds/shield-wall.mp3';
      case 'strength':
        return '/game-sounds/strength.mp3';
      case 'strengthaura':
        return '/game-sounds/strength-aura.mp3';
      case 'lightning':
        return '/game-sounds/lightning.mp3';
      case 'firerain':
        return '/game-sounds/fire-rain.mp3';
      case 'spiritguide':
        return '/game-sounds/spirit-guide.mp3';
      case 'spiritguardian':
      case 'spiritguarian':
        return '/game-sounds/spirit-guardian.mp3';
      case 'spiritwarrior':
        return '/game-sounds/spirit-warrior.mp3';
      case 'raisedead':
        return '/game-sounds/raise-dead.mp3';
      case 'animatecorpse':
        return '/game-sounds/animate-corpse.mp3';
      case 'raisedemon':
        return '/game-sounds/raise-demon.mp3';
      case 'tangletwist':
        return '/game-sounds/tangle-twist.mp3';
      case 'poisoncloud':
        return '/game-sounds/poison-cloud.mp3';
      case 'timewarp':
        return '/game-sounds/time-warp.mp3';
      case 'firebreath':
        return '/game-sounds/fire-breath.mp3';
      case 'familiar':
      case 'summonfamiliar':
        return '/game-sounds/familiar.mp3';

      default:
        return '/game-sounds/spirit-arrow.mp3';
    }
  }

  // 4. Effects (poison, burn, etc.)
  if (event.actionType === 'effect') {
    if (actionNameLower.includes('poison') || actionNameLower.includes('venom')) {
      return '/game-sounds/poison-cloud.mp3';
    }
    if (actionNameLower.includes('burn') || actionNameLower.includes('fire')) {
      return '/game-sounds/fire-wall.mp3';
    }
    return '/game-sounds/attack-miss.mp3';
  }

  return null;
}

// Active audio instances for polyphonic playback tracking
const activeAudios = new Set<HTMLAudioElement>();

let sharedAudioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      try {
        sharedAudioContext = new AudioContextClass();
      } catch {
        // Ignore initialization failure
      }
    }
  }
  return sharedAudioContext;
}

/**
 * Unlocks audio permissions in mobile browsers (like Chrome on Android or iOS Safari).
 * Must be invoked from within a direct user interaction event (such as click or change).
 * Resumes any suspended AudioContext and plays a momentary silent buffer / audio element
 * to prime the browser's audio engine and satisfy autoplay policy restrictions.
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  // In test environments (like jsdom), skip audio hardware priming
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return;
  }

  // 1. Resume / prime Web Audio API AudioContext
  try {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        void ctx.resume();
      }
      // Play a short silent buffer to prime audio hardware
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
  } catch {
    // Ignore audio context errors
  }

  // 2. Prime HTMLAudioElement playback with a silent audio data URL
  try {
    if (typeof Audio !== 'undefined') {
      const silentAudio = new Audio(
        'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'
      );
      const playPromise = silentAudio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            silentAudio.pause();
          })
          .catch(() => {
            // Ignore failure
          });
      }
    }
  } catch {
    // Ignore audio initialization errors
  }
}

/**
 * Safely plays a combat sound using HTMLAudioElement.
 * Allows polyphonic overlapping so longer sounds (like War Cry or roars)
 * continue playing smoothly across replay steps.
 * Gracefully no-ops in non-browser environments or when audio fails/is blocked.
 */
export function playCombatSound(soundUrl: string | null, volume: number = 0.5): void {
  if (!soundUrl || typeof window === 'undefined' || typeof Audio === 'undefined') return;

  // In test environments (like jsdom), HTMLMediaElement.prototype.play is unimplemented
  if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
    return;
  }

  try {
    const audio = new Audio(soundUrl);
    audio.volume = Math.max(0, Math.min(1, volume));

    activeAudios.add(audio);
    const cleanup = () => {
      activeAudios.delete(audio);
      audio.removeEventListener('ended', cleanup);
      audio.removeEventListener('error', cleanup);
    };
    audio.addEventListener('ended', cleanup);
    audio.addEventListener('error', cleanup);

    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {
        cleanup();
      });
    }
  } catch {
    // Ignore audio initialization failures in unsupported environments
  }
}

/**
 * Stops all currently active overlapping combat sounds.
 * Useful when pausing or restarting the replay.
 */
export function stopAllCombatSounds(): void {
  for (const audio of activeAudios) {
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Ignore
    }
  }
  activeAudios.clear();
}
