"""
Sound effect generator for Tablerunner battle replay.
Synthesizes pure 16-bit 44.1kHz mono WAV combat sound effects using DSP acoustic modeling:
- Physical modeling (plucked bowstring tension, steel blade collision resonance)
- Modal synthesis (inharmonic metallic frequencies, crystal ice shatter)
- Formant filtering (liquid potion gulps, guttural war roars)
- FM synthesis & subtractive bandpass/lowpass noise sculpting (fire, lightning, wind, magic)
- Polyphonic overlap support (quick strikes ~350ms, sustained actions like War Cry ~1.0s)
"""

import os
import math
import struct
import random
import wave

SAMPLE_RATE = 44100
SOUNDS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'sounds')

# --- Audio Math & Utilities ---

def clamp(val, low=-1.0, high=1.0):
    return max(low, min(high, val))

def soft_clip(x):
    return math.tanh(x)

def white_noise():
    return random.uniform(-1.0, 1.0)

def pink_noise_gen():
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    while True:
        white = random.uniform(-1.0, 1.0)
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        yield (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
        b6 = white * 0.115926

def env_adsr(t, duration, attack=0.01, decay=0.08, sustain=0.4, release=0.1):
    if t < attack:
        return t / max(attack, 0.0001)
    t_after_att = t - attack
    if t_after_att < decay:
        return 1.0 - (1.0 - sustain) * (t_after_att / max(decay, 0.0001))
    rel_start = duration - release
    if t < rel_start:
        return sustain
    rel_t = t - rel_start
    return sustain * max(0.0, 1.0 - rel_t / max(release, 0.0001))

class BiquadFilter:
    def __init__(self, filter_type='bandpass', f0=1000.0, q=2.0, sample_rate=SAMPLE_RATE):
        self.sample_rate = sample_rate
        self.filter_type = filter_type
        self.set_params(f0, q)
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def set_params(self, f0, q):
        f0 = max(20.0, min(self.sample_rate * 0.48, f0))
        q = max(0.1, q)
        w0 = 2.0 * math.pi * f0 / self.sample_rate
        alpha = math.sin(w0) / (2.0 * q)
        cos_w0 = math.cos(w0)

        if self.filter_type == 'bandpass':
            b0 = alpha; b1 = 0.0; b2 = -alpha
            a0 = 1.0 + alpha; a1 = -2.0 * cos_w0; a2 = 1.0 - alpha
        elif self.filter_type == 'lowpass':
            b0 = (1.0 - cos_w0) / 2.0; b1 = 1.0 - cos_w0; b2 = (1.0 - cos_w0) / 2.0
            a0 = 1.0 + alpha; a1 = -2.0 * cos_w0; a2 = 1.0 - alpha
        elif self.filter_type == 'highpass':
            b0 = (1.0 + cos_w0) / 2.0; b1 = -(1.0 + cos_w0); b2 = (1.0 + cos_w0) / 2.0
            a0 = 1.0 + alpha; a1 = -2.0 * cos_w0; a2 = 1.0 - alpha
        else:
            b0 = 1.0; b1 = 0.0; b2 = 0.0; a0 = 1.0; a1 = 0.0; a2 = 0.0

        self.b0 = b0 / a0; self.b1 = b1 / a0; self.b2 = b2 / a0
        self.a1 = a1 / a0; self.a2 = a2 / a0

    def process(self, x):
        y = self.b0 * x + self.b1 * self.x1 + self.b2 * self.x2 - self.a1 * self.y1 - self.a2 * self.y2
        self.x2 = self.x1; self.x1 = x
        self.y2 = self.y1; self.y1 = y
        return y

def write_wav(filename, samples, sample_rate=SAMPLE_RATE):
    os.makedirs(SOUNDS_DIR, exist_ok=True)
    filepath = os.path.join(SOUNDS_DIR, filename)

    peak = max(abs(s) for s in samples) if samples else 0
    if peak > 0.0001:
        gain = 0.89 / peak
        samples = [soft_clip(s * gain) for s in samples]

    int_samples = [int(clamp(s, -1.0, 1.0) * 32767) for s in samples]
    with wave.open(filepath, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(struct.pack('<' + 'h' * len(int_samples), *int_samples))
    return filepath, len(samples) / sample_rate

# --- Handcrafted Sound Effect Recipes ---

def gen_sword_clash(duration=0.38):
    """High carbon steel blades striking: friction scraping transient + resonant metallic modes."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    modes = [(1380.0, 1.0, 16.0), (2150.0, 0.8, 20.0), (3280.0, 0.6, 26.0), (4750.0, 0.4, 32.0)]
    bp = BiquadFilter('bandpass', 3500.0, 2.5)
    for i in range(min(n, int(SAMPLE_RATE * 0.05))):
        t = i / SAMPLE_RATE
        samples[i] += bp.process(white_noise()) * ((1.0 - t / 0.05) ** 2) * 1.5
    for f, amp, decay in modes:
        phase = random.uniform(0, 2 * math.pi)
        for i in range(n):
            t = i / SAMPLE_RATE
            samples[i] += (math.sin(2 * math.pi * f * t + phase) + 0.35 * math.sin(2 * math.pi * f * 1.015 * t)) * math.exp(-decay * t) * amp * 0.35
    for i in range(min(n, int(SAMPLE_RATE * 0.07))):
        t = i / SAMPLE_RATE
        samples[i] += math.sin(2 * math.pi * (90 - 45 * (t / 0.07)) * t) * math.exp(-35 * t) * 0.6
    return samples

def gen_bow_twang(duration=0.35):
    """Snappy wooden bowstring release + whistling arrow whoosh."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 150.0 - 25.0 * min(1.0, t / 0.08)
        harm = math.sin(2 * math.pi * f * t) + 0.7 * math.sin(4 * math.pi * f * t) * math.exp(-15 * t)
        samples[i] += harm * math.exp(-11.0 * t) * 0.7
    for i in range(int(SAMPLE_RATE * 0.015)):
        t = i / SAMPLE_RATE
        samples[i] += white_noise() * (1.0 - t / 0.015) * 0.8
    bp = BiquadFilter('bandpass', 1200.0, 4.0)
    for i in range(int(SAMPLE_RATE * 0.04), n):
        t = (i - int(SAMPLE_RATE * 0.04)) / SAMPLE_RATE
        bp.set_params(900.0 + 2400.0 * (t / 0.3), 3.5)
        samples[i] += bp.process(white_noise()) * (math.sin(math.pi * min(1.0, t / 0.3)) ** 2) * 0.45
    return samples

def gen_potion_drink(duration=0.42):
    """Cork pop + quick double liquid gulp + restorative sparkle."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(int(SAMPLE_RATE * 0.035)):
        t = i / SAMPLE_RATE
        samples[i] += math.sin(2 * math.pi * (1300 - 900 * (t / 0.035)) * t) * ((1.0 - t / 0.035) ** 2) * 0.85
    for start_t, f_start, f_end in [(0.06, 280.0, 500.0), (0.18, 330.0, 580.0)]:
        st = int(SAMPLE_RATE * start_t)
        for i in range(int(SAMPLE_RATE * 0.10)):
            if st + i >= n: break
            t = i / SAMPLE_RATE
            p = t / 0.10
            f = f_start + (f_end - f_start) * math.sin(math.pi * p)
            samples[st + i] += (math.sin(2 * math.pi * f * t) + 0.3 * math.sin(4 * math.pi * f * t)) * (math.sin(math.pi * p) ** 1.8) * 0.65
    for ch_f in [1760.0, 2200.0, 2750.0, 3520.0]:
        st = int(SAMPLE_RATE * 0.28)
        for i in range(st, n):
            t = (i - st) / SAMPLE_RATE
            samples[i] += math.sin(2 * math.pi * ch_f * t) * math.exp(-15.0 * t) * 0.18
    return samples

def gen_attack_miss(duration=0.25):
    """Fast swoosh of a missed strike."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 500.0, 2.0)
    for i in range(n):
        t = i / SAMPLE_RATE
        p = t / duration
        bp.set_params(400.0 + 1400.0 * math.sin(math.pi * p), 2.2)
        samples[i] = bp.process(white_noise()) * (math.sin(math.pi * p) ** 2) * 1.4
    return samples

def gen_defeat(duration=0.45):
    """Deep body collapse thud + dark low gong resonance."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 110.0 - 75.0 * min(1.0, t / 0.35)
        sub = math.sin(2 * math.pi * f * t) * math.exp(-7.0 * t)
        bell = (math.sin(2 * math.pi * 174.6 * t) + 0.5 * math.sin(2 * math.pi * 233.1 * t)) * math.exp(-9.0 * t)
        samples[i] = (sub * 0.7 + bell * 0.4)
    return samples

# --- Barbarian Actions ---

def gen_barbarian_war_cry(duration=1.0):
    """Booming war horn & echoing battle rally shout."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    horn_chord = [220.0, 330.0, 440.0]
    for i in range(n):
        t = i / SAMPLE_RATE
        env = env_adsr(t, duration, attack=0.06, decay=0.25, sustain=0.7, release=0.35)
        horn = sum(math.sin(2 * math.pi * f * t) + 0.35 * math.sin(4 * math.pi * f * t) for f in horn_chord)
        brass = soft_clip(horn * 1.5)
        shout_f = 140.0 + 30.0 * math.sin(2 * math.pi * 5.0 * t)
        vocal = math.sin(2 * math.pi * shout_f * t) + 0.5 * math.sin(4 * math.pi * shout_f * t)
        samples[i] = (brass * 0.4 + vocal * 0.4) * env
    return samples

def gen_barbarian_rage(duration=0.85):
    """Furious guttural battle roar and adrenaline pulse."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        env = env_adsr(t, duration, attack=0.05, decay=0.18, sustain=0.75, release=0.25)
        f = 115.0 + 30.0 * math.sin(2 * math.pi * 7.0 * t)
        raw = math.sin(2 * math.pi * f * t) + 0.6 * math.sin(4 * math.pi * f * t) + 0.4 * math.sin(6 * math.pi * f * t)
        grunt = soft_clip(raw * 2.2)
        thump = math.sin(2 * math.pi * 55.0 * t) * 0.5
        samples[i] = (grunt * 0.6 + thump * 0.4) * env
    return samples

def gen_barbarian_berserker(duration=1.0):
    """Frenzied battle roar with heavy pounding heartbeat kicks."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for beat_t in [0.03, 0.25, 0.55]:
        st = int(SAMPLE_RATE * beat_t)
        for j in range(int(SAMPLE_RATE * 0.15)):
            if st + j >= n: break
            t = j / SAMPLE_RATE
            samples[st + j] += math.sin(2 * math.pi * 58.0 * t) * math.exp(-18.0 * t) * 0.9
    for i in range(n):
        t = i / SAMPLE_RATE
        env = env_adsr(t, duration, attack=0.06, decay=0.2, sustain=0.75, release=0.3)
        roar_f = 100.0 + 40.0 * math.sin(2 * math.pi * 8.0 * t)
        roar = soft_clip(math.sin(2 * math.pi * roar_f * t) * 2.5) * 0.5
        samples[i] += roar * env
    return samples

def gen_barbarian_mighty_cleave(duration=0.45):
    """Heavy axe swing whoosh into a bone-crushing impact."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 400.0, 1.8)
    for i in range(int(SAMPLE_RATE * 0.15)):
        t = i / SAMPLE_RATE
        bp.set_params(250.0 + 850.0 * (t / 0.15), 2.0)
        samples[i] += bp.process(white_noise()) * math.sin(math.pi * (t / 0.15)) * 0.8
    hit_idx = int(SAMPLE_RATE * 0.13)
    lp = BiquadFilter('lowpass', 500.0, 1.5)
    for i in range(hit_idx, n):
        t = (i - hit_idx) / SAMPLE_RATE
        sub = math.sin(2 * math.pi * (135.0 - 95.0 * min(1.0, t / 0.25)) * t) * math.exp(-10.0 * t)
        metal = (math.sin(2 * math.pi * 840.0 * t) + math.sin(2 * math.pi * 1420.0 * t)) * math.exp(-22.0 * t) * 0.4
        crunch = lp.process(white_noise()) * math.exp(-16.0 * t) * 1.2
        samples[i] += (sub * 0.7 + metal + crunch * 0.6)
    return samples

def gen_barbarian_iron_skin(duration=0.42):
    """Heavy anvil strike and solid steel lock."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    modes = [(580.0, 1.0, 12.0), (1160.0, 0.7, 18.0), (2320.0, 0.5, 26.0), (3480.0, 0.3, 34.0)]
    for i in range(int(SAMPLE_RATE * 0.02)):
        t = i / SAMPLE_RATE
        samples[i] += white_noise() * (1.0 - t / 0.02) * 1.2
    for i in range(n):
        t = i / SAMPLE_RATE
        clank = sum(math.sin(2 * math.pi * f * t) * math.exp(-dec * t) * amp for f, amp, dec in modes)
        samples[i] += clank * 0.4
    return samples

def gen_barbarian_whirlwind(duration=0.65):
    """Three rapid blade vortex whooshes."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 1200.0, 3.0)
    for st in [0.0, 0.16, 0.32]:
        idx = int(SAMPLE_RATE * st)
        dur = 0.20
        for j in range(int(SAMPLE_RATE * dur)):
            if idx + j >= n: break
            t = j / SAMPLE_RATE
            p = t / dur
            bp.set_params(500.0 + 1600.0 * math.sin(math.pi * p), 2.5)
            samples[idx + j] += bp.process(white_noise()) * (math.sin(math.pi * p) ** 1.5) * 1.2
    return samples

def gen_barbarian_bloodthirst(duration=0.45):
    """Vicious tearing slash & dark vampiric siphon."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(int(SAMPLE_RATE * 0.14)):
        t = i / SAMPLE_RATE
        slash = white_noise() * math.exp(-20.0 * t) * 1.0
        blade = math.sin(2 * math.pi * 1800.0 * t) * math.exp(-28.0 * t) * 0.5
        samples[i] += slash + blade
    for i in range(int(SAMPLE_RATE * 0.08), n):
        t = (i - int(SAMPLE_RATE * 0.08)) / SAMPLE_RATE
        pulse = math.sin(2 * math.pi * 95.0 * t) * math.exp(-8.0 * t) * 0.6
        drain = math.sin(2 * math.pi * 440.0 * t + math.sin(2 * math.pi * 20 * t) * 4.0) * math.exp(-9.0 * t) * 0.35
        samples[i] += pulse + drain
    return samples

# --- Ranger Actions ---

def gen_ranger_focus(duration=0.45):
    """Breath intake + crystal focus chime."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 1200.0, 1.8)
    for i in range(int(SAMPLE_RATE * 0.22)):
        t = i / SAMPLE_RATE
        p = t / 0.22
        bp.set_params(800.0 + 700.0 * p, 2.0)
        samples[i] += bp.process(white_noise()) * (p ** 2) * 0.5
    chime_idx = int(SAMPLE_RATE * 0.18)
    for i in range(chime_idx, n):
        t = (i - chime_idx) / SAMPLE_RATE
        bell = (math.sin(2 * math.pi * 1046.5 * t) + 0.3 * math.sin(4 * math.pi * 1046.5 * t)) * math.exp(-9.0 * t)
        samples[i] += bell * 0.4
    return samples

def gen_ranger_pinning_shot(duration=0.42):
    """Fast arrow twang + solid wooden pinning thud."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(int(SAMPLE_RATE * 0.13)):
        t = i / SAMPLE_RATE
        samples[i] += math.sin(2 * math.pi * 165.0 * t) * math.exp(-24.0 * t) * 0.7
    thud_idx = int(SAMPLE_RATE * 0.12)
    for i in range(thud_idx, n):
        t = (i - thud_idx) / SAMPLE_RATE
        thud = math.sin(2 * math.pi * 85.0 * t) * math.exp(-15.0 * t) * 0.9
        wood = math.sin(2 * math.pi * 320.0 * t) * math.exp(-28.0 * t) * 0.5
        samples[i] += (thud + wood) * 0.6
    return samples

def gen_ranger_evasive_step(duration=0.32):
    """Swift aerodynamic dodge rustle."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 1600.0, 2.2)
    for i in range(n):
        t = i / SAMPLE_RATE
        p = t / duration
        bp.set_params(900.0 + 1500.0 * math.sin(math.pi * p), 2.5)
        samples[i] = bp.process(white_noise()) * (math.sin(math.pi * p) ** 1.8) * 1.2
    return samples

def gen_ranger_multi_shot(duration=0.55):
    """Three rapid-fire bowstring twangs."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for st in [0.0, 0.12, 0.24]:
        idx = int(SAMPLE_RATE * st)
        for j in range(int(SAMPLE_RATE * 0.25)):
            if idx + j >= n: break
            t = j / SAMPLE_RATE
            twang = (math.sin(2 * math.pi * 160.0 * t) + 0.5 * math.sin(4 * math.pi * 160.0 * t)) * math.exp(-20.0 * t)
            whoosh = white_noise() * math.exp(-28.0 * t) * 0.4
            samples[idx + j] += (twang * 0.6 + whoosh) * 0.7
    return samples

def gen_ranger_poison_arrow(duration=0.45):
    """Arrow shot + toxic venom sizzle."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(int(SAMPLE_RATE * 0.12)):
        t = i / SAMPLE_RATE
        samples[i] += math.sin(2 * math.pi * 150.0 * t) * math.exp(-20.0 * t) * 0.7
    hiss_idx = int(SAMPLE_RATE * 0.10)
    bp = BiquadFilter('bandpass', 3200.0, 2.5)
    for i in range(hiss_idx, n):
        t = (i - hiss_idx) / SAMPLE_RATE
        env = math.exp(-7.0 * t)
        hiss = bp.process(white_noise()) * env * 0.9
        bubble = math.sin(2 * math.pi * (500.0 + 400.0 * math.sin(2 * math.pi * 12 * t)) * t) * 0.25 * env
        samples[i] += hiss + bubble
    return samples

def gen_ranger_sniper_shot(duration=0.48):
    """Supersonic whistling streak + vicious puncture."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 2400.0, 4.5)
    for i in range(int(SAMPLE_RATE * 0.17)):
        t = i / SAMPLE_RATE
        p = t / 0.17
        bp.set_params(1200.0 + 2800.0 * p, 4.0)
        samples[i] += bp.process(white_noise()) * (p ** 2) * 1.1
    hit_idx = int(SAMPLE_RATE * 0.15)
    for i in range(hit_idx, n):
        t = (i - hit_idx) / SAMPLE_RATE
        puncture = math.sin(2 * math.pi * 185.0 * t) * math.exp(-14.0 * t) * 0.9
        crack = white_noise() * math.exp(-40.0 * t) * 1.0
        samples[i] += (puncture + crack) * 0.6
    return samples

def gen_ranger_call_companion(duration=0.65):
    """Hawk hunting whistle and woodland call."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        p = t / duration
        f = 1400.0 + 950.0 * math.sin(math.pi * p) ** 0.8
        mod = math.sin(2 * math.pi * 18.0 * t) * 50.0
        whistle = math.sin(2 * math.pi * (f + mod) * t) + 0.2 * math.sin(4 * math.pi * (f + mod) * t)
        env = math.sin(math.pi * p) ** 1.3
        samples[i] = whistle * env * 0.55
    return samples

# --- Spells ---

def gen_spirit_arrow(duration=0.38):
    """Mystical mana bolt with ether shimmer."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        p = t / duration
        f = 880.0 + 1000.0 * (p ** 0.5)
        mod = math.sin(2 * math.pi * 55.0 * t) * 140.0
        tone = math.sin(2 * math.pi * (f + mod) * t)
        shimmer = math.sin(2 * math.pi * (f * 2.5) * t) * 0.3
        samples[i] = (tone + shimmer) * (math.sin(math.pi * p) ** 0.8) * math.exp(-3.5 * t) * 0.7
    return samples

def gen_fireball(duration=0.55):
    """Fire whoosh into an explosive detonation boom."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 600.0, 1.8)
    for i in range(int(SAMPLE_RATE * 0.20)):
        t = i / SAMPLE_RATE
        bp.set_params(300.0 + 1000.0 * (t / 0.20), 2.0)
        samples[i] += bp.process(white_noise()) * ((t / 0.20) ** 1.5) * 0.7
    boom_start = int(SAMPLE_RATE * 0.18)
    lp = BiquadFilter('lowpass', 420.0, 1.5)
    for i in range(boom_start, n):
        t = (i - boom_start) / SAMPLE_RATE
        sub_f = 160.0 - 125.0 * min(1.0, t / 0.32)
        sub = math.sin(2 * math.pi * sub_f * t) * math.exp(-7.0 * t)
        burst = lp.process(white_noise()) * math.exp(-8.0 * t) * 1.5
        samples[i] += (sub * 0.8 + burst * 0.7)
    return samples

def gen_fire_wall(duration=0.95):
    """Roaring sheet of sustained flames."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    pink = pink_noise_gen()
    bp = BiquadFilter('bandpass', 450.0, 1.5)
    for i in range(n):
        t = i / SAMPLE_RATE
        bp.set_params(380.0 + 220.0 * math.sin(2 * math.pi * 5.0 * t), 1.4)
        raw = next(pink)
        if random.random() < 0.01: raw += random.uniform(-1.5, 1.5)
        samples[i] = bp.process(raw) * env_adsr(t, duration, 0.05, 0.1, 0.75, 0.25) * 1.3
    return samples

def gen_ice_shards(duration=0.42):
    """Brittle glacial ice shattering on impact."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for start_t, freqs in [(0.0, [2400.0, 3600.0, 5200.0]), (0.05, [2100.0, 4200.0, 6100.0]), (0.1, [2800.0, 4800.0, 6900.0])]:
        st = int(SAMPLE_RATE * start_t)
        for i in range(st, n):
            t = (i - st) / SAMPLE_RATE
            chime = sum(math.sin(2 * math.pi * f * t) for f in freqs) * 0.25
            samples[i] += chime * math.exp(-24.0 * t)
            if t < 0.02: samples[i] += white_noise() * (1.0 - t / 0.02) * 0.5
    return samples

def gen_ice_storm(duration=1.0):
    """Howling blizzard with freezing ice cracks."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    pink = pink_noise_gen()
    bp = BiquadFilter('bandpass', 520.0, 2.8)
    for i in range(n):
        t = i / SAMPLE_RATE
        bp.set_params(420.0 + 380.0 * math.sin(2 * math.pi * 2.5 * t), 2.5)
        samples[i] += bp.process(next(pink)) * env_adsr(t, duration, 0.1, 0.15, 0.7, 0.25) * 1.1
    for crack_t in [0.12, 0.28, 0.45, 0.65]:
        idx = int(SAMPLE_RATE * crack_t)
        for j in range(int(SAMPLE_RATE * 0.04)):
            if idx + j >= n: break
            t = j / SAMPLE_RATE
            samples[idx + j] += math.sin(2 * math.pi * 3800 * t) * math.exp(-65 * t) * 0.4
    return samples

def gen_heal(duration=0.55):
    """Radiant holy chime arpeggio (C major 9)."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    notes = [(0.0, 523.25), (0.08, 659.25), (0.16, 783.99), (0.24, 987.77), (0.32, 1174.66)]
    for start_t, f in notes:
        st = int(SAMPLE_RATE * start_t)
        for i in range(st, n):
            t = (i - st) / SAMPLE_RATE
            tone = (math.sin(2 * math.pi * f * t) + 0.35 * math.sin(4 * math.pi * f * t)) * (1.0 + 0.08 * math.sin(2 * math.pi * 6.0 * t))
            samples[i] += tone * math.exp(-7.0 * t) * 0.3
    return samples

def gen_healing_aura(duration=0.95):
    """Harmonious divine choral swell."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    chord = [349.23, 440.0, 523.25, 659.25, 880.0]
    for i in range(n):
        t = i / SAMPLE_RATE
        env = env_adsr(t, duration, 0.1, 0.15, 0.7, 0.25)
        val = sum(math.sin(2 * math.pi * f * t + f * 0.01) + 0.25 * math.sin(4 * math.pi * f * t) for f in chord)
        shimmer = math.sin(2 * math.pi * 1760 * t) * 0.12
        samples[i] = (val * 0.15 + shimmer) * env
    return samples

def gen_fear(duration=0.55):
    """Eerie spectral dissonance & tremolo."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        p = t / duration
        f = 460.0 - 140.0 * p + 40.0 * math.sin(2 * math.pi * 10.0 * t)
        s1 = math.sin(2 * math.pi * f * t)
        s2 = math.sin(2 * math.pi * (f * 1.414) * t) * 0.7
        samples[i] = (s1 + s2) * env_adsr(t, duration, 0.05, 0.1, 0.7, 0.2) * 0.45
    return samples

def gen_terror(duration=1.0):
    """Deep horrifying horror drone & screech."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        sub = math.sin(2 * math.pi * 55.0 * t) * 0.8
        cluster = math.sin(2 * math.pi * 110.0 * t) * 0.6 + math.sin(2 * math.pi * 116.5 * t) * 0.5 + math.sin(2 * math.pi * 155.6 * t) * 0.4
        samples[i] = (sub + cluster) * env_adsr(t, duration, 0.06, 0.15, 0.75, 0.25) * 0.5
    return samples

def gen_shield(duration=0.42):
    """Crystalline barrier ping & hum."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        ping = sum(math.sin(2 * math.pi * f * t) * math.exp(-16.0 * t) for f in [880.0, 1760.0, 2640.0, 3520.0]) * 0.25
        hum = math.sin(2 * math.pi * 220.0 * t) * math.exp(-5.0 * t) * 0.4
        samples[i] = ping + hum
    return samples

def gen_shield_wall(duration=0.9):
    """Resonant fortress barrier gong."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    modes = [(130.0, 0.8, 5.0), (260.0, 0.6, 6.5), (390.0, 0.4, 8.0), (780.0, 0.3, 12.0)]
    for i in range(n):
        t = i / SAMPLE_RATE
        samples[i] = sum(math.sin(2 * math.pi * f * t) * math.exp(-dec * t) * amp for f, amp, dec in modes) * 0.5
    return samples

def gen_strength(duration=0.45):
    """Ascending energy surge."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 170.0 + 440.0 * ((t / duration) ** 1.8)
        val = math.sin(2 * math.pi * f * t) + 0.5 * math.sin(4 * math.pi * f * t)
        samples[i] = val * env_adsr(t, duration, 0.05, 0.1, 0.7, 0.15) * 0.4
    return samples

def gen_strength_aura(duration=0.95):
    """Radiating war might pulse."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    chord = [110.0, 164.8, 220.0, 277.2, 329.6]
    for i in range(n):
        t = i / SAMPLE_RATE
        pulse = math.sin(2 * math.pi * 60.0 * t) * 0.5
        val = sum(math.sin(2 * math.pi * f * t) for f in chord) * 0.2
        samples[i] = (pulse + val) * env_adsr(t, duration, 0.08, 0.15, 0.7, 0.25) * 0.5
    return samples

def gen_lightning(duration=0.55):
    """High voltage zap crackle into an explosive thunderclap."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(int(SAMPLE_RATE * 0.14)):
        t = i / SAMPLE_RATE
        f = 3400.0 - 2600.0 * (t / 0.14)
        zap = math.sin(2 * math.pi * f * t + math.sin(2 * math.pi * 260 * t) * 8.0)
        spikes = white_noise() * 1.2 if random.random() < 0.25 else 0.0
        samples[i] += (zap * 0.6 + spikes * 0.7) * math.exp(-18.0 * t)
    boom_start = int(SAMPLE_RATE * 0.05)
    lp = BiquadFilter('lowpass', 300.0, 1.6)
    for i in range(boom_start, n):
        t = (i - boom_start) / SAMPLE_RATE
        boom_f = 125.0 - 85.0 * min(1.0, t / 0.35)
        sub = math.sin(2 * math.pi * boom_f * t) * math.exp(-6.5 * t)
        rumble = lp.process(white_noise()) * math.exp(-7.0 * t) * 1.5
        samples[i] += (sub * 0.7 + rumble * 0.8)
    return samples

def gen_fire_rain(duration=0.85):
    """Whistling falling meteors and cascading fiery bursts."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for drop_t in [0.0, 0.12, 0.24, 0.38]:
        st = int(SAMPLE_RATE * drop_t)
        for i in range(st, min(n, st + int(SAMPLE_RATE * 0.25))):
            t = (i - st) / SAMPLE_RATE
            whistle_f = 1500.0 - 1200.0 * (t / 0.25)
            s = math.sin(2 * math.pi * whistle_f * t) * math.exp(-12.0 * t)
            pop = white_noise() * math.exp(-22.0 * t) * 0.4
            samples[i] += (s * 0.35 + pop) * 0.6
    return samples

def gen_spirit_guide(duration=0.6):
    """Delicate celestial wind chime cascade."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for start_t, f in [(0.0, 784.0), (0.1, 988.0), (0.2, 1175.0), (0.3, 1568.0)]:
        st = int(SAMPLE_RATE * start_t)
        for i in range(st, n):
            t = (i - st) / SAMPLE_RATE
            samples[i] += math.sin(2 * math.pi * f * t) * math.exp(-7.0 * t) * 0.25
    return samples

def gen_spirit_guardian(duration=0.85):
    """Sacred temple bell gong and protective presence."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        samples[i] = sum(math.sin(2 * math.pi * f * t) * math.exp(-5.0 * t) for f in [432.0, 648.0, 864.0, 1296.0]) * 0.15
    return samples

def gen_spirit_warrior(duration=0.9):
    """Spectral battle summon fanfare."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for start_t, f in [(0.0, 293.66), (0.12, 392.0), (0.24, 440.0), (0.36, 587.33)]:
        st = int(SAMPLE_RATE * start_t)
        for i in range(st, n):
            t = (i - st) / SAMPLE_RATE
            samples[i] += (math.sin(2 * math.pi * f * t) + 0.4 * math.sin(4 * math.pi * f * t)) * math.exp(-6.0 * t) * 0.25
    return samples

def gen_raise_dead(duration=0.85):
    """Ground tremor and rattling dry bones."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        samples[i] += math.sin(2 * math.pi * 65.0 * t) * math.exp(-4.0 * t) * 0.6
    for bt in [0.06, 0.15, 0.24, 0.35, 0.48]:
        st = int(SAMPLE_RATE * bt)
        for j in range(int(SAMPLE_RATE * 0.03)):
            if st + j >= n: break
            t = j / SAMPLE_RATE
            samples[st + j] += math.sin(2 * math.pi * (950.0 + random.uniform(-100, 100)) * t) * math.exp(-80.0 * t) * 0.5
    return samples

def gen_animate_corpse(duration=0.6):
    """Sickening bone snap and dark necromantic energy."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(int(SAMPLE_RATE * 0.08)):
        t = i / SAMPLE_RATE
        samples[i] += white_noise() * math.exp(-35.0 * t) * 0.9
    for i in range(n):
        t = i / SAMPLE_RATE
        samples[i] += (math.sin(2 * math.pi * 75.0 * t) + 0.4 * math.sin(2 * math.pi * 112.5 * t)) * math.exp(-5.0 * t) * 0.6
    return samples

def gen_raise_demon(duration=1.1):
    """Brimstone hellfire burst and monstrous demon roar."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    lp = BiquadFilter('lowpass', 350.0, 1.8)
    for i in range(n):
        t = i / SAMPLE_RATE
        f = 75.0 - 25.0 * min(1.0, t / 0.6)
        growl = math.sin(2 * math.pi * f * t + math.sin(2 * math.pi * 22.0 * t) * 5.0)
        fire = lp.process(white_noise()) * math.exp(-5.0 * t) * 1.2
        samples[i] = (growl * 0.6 + fire * 0.5) * env_adsr(t, duration, 0.04, 0.2, 0.75, 0.3)
    return samples

def gen_tangle_twist(duration=0.45):
    """Whipping vine lash & wooden snare snap."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 1400.0, 2.5)
    for i in range(int(SAMPLE_RATE * 0.2)):
        t = i / SAMPLE_RATE
        bp.set_params(600.0 + 1800.0 * (t / 0.2), 3.0)
        samples[i] += bp.process(white_noise()) * math.sin(math.pi * (t / 0.2)) * 0.9
    snap_idx = int(SAMPLE_RATE * 0.18)
    for i in range(snap_idx, min(n, snap_idx + int(SAMPLE_RATE * 0.12))):
        t = (i - snap_idx) / SAMPLE_RATE
        wood = math.sin(2 * math.pi * 480.0 * t) * math.exp(-40.0 * t)
        crack = white_noise() * math.exp(-65.0 * t) * 1.1
        samples[i] += (wood * 0.6 + crack * 0.7)
    return samples

def gen_poison_cloud(duration=0.7):
    """Hissing toxic gas & bubbling liquid."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    bp = BiquadFilter('bandpass', 2400.0, 2.0)
    for i in range(n):
        t = i / SAMPLE_RATE
        samples[i] += bp.process(white_noise()) * env_adsr(t, duration, 0.06, 0.1, 0.7, 0.2) * 0.8
    for bub_t in [0.08, 0.20, 0.34, 0.50]:
        idx = int(SAMPLE_RATE * bub_t)
        for j in range(int(SAMPLE_RATE * 0.05)):
            if idx + j >= n: break
            t = j / SAMPLE_RATE
            samples[idx + j] += math.sin(2 * math.pi * (450.0 + 550.0 * (t / 0.05)) * t) * math.sin(math.pi * (t / 0.05)) * 0.4
    return samples

def gen_time_warp(duration=0.7):
    """Cosmic space-time reverse pitch warp whoosh."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for i in range(n):
        t = i / SAMPLE_RATE
        p = t / duration
        f = 180.0 + 950.0 * (math.sin(math.pi * p) ** 1.5)
        mod = math.sin(2 * math.pi * 16.0 * t) * 90.0
        samples[i] = math.sin(2 * math.pi * (f + mod) * t) * (math.sin(math.pi * p) ** 1.2) * 0.6
    return samples

def gen_fire_breath(duration=1.1):
    """Torrential dragon flamethrower roar."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    pink = pink_noise_gen()
    bp = BiquadFilter('bandpass', 650.0, 1.4)
    for i in range(n):
        t = i / SAMPLE_RATE
        bp.set_params(480.0 + 320.0 * math.sin(2 * math.pi * 5.5 * t), 1.5)
        roar = math.sin(2 * math.pi * 80.0 * t) * 0.45
        samples[i] = (bp.process(next(pink)) * 1.35 + roar) * env_adsr(t, duration, 0.05, 0.15, 0.8, 0.3) * 0.8
    return samples

def gen_familiar(duration=0.4):
    """Playful magical companion chirping pop."""
    n = int(SAMPLE_RATE * duration)
    samples = [0.0] * n
    for start_t, f1, f2 in [(0.0, 600.0, 1300.0), (0.14, 850.0, 1650.0)]:
        st = int(SAMPLE_RATE * start_t)
        for i in range(st, min(n, st + int(SAMPLE_RATE * 0.14))):
            t = (i - st) / SAMPLE_RATE
            p = t / 0.14
            samples[i] += math.sin(2 * math.pi * (f1 + (f2 - f1) * p) * t) * math.sin(math.pi * p) * 0.45
    return samples

# --- Master Registry of Generators ---

GENERATORS = {
    # Core Combat
    'sword-clash.wav': gen_sword_clash,
    'bow-twang.wav': gen_bow_twang,
    'potion-drink.wav': gen_potion_drink,
    'attack-miss.wav': gen_attack_miss,
    'defeat.wav': gen_defeat,

    # Barbarian Special Actions
    'barbarian-war-cry.wav': gen_barbarian_war_cry,
    'barbarian-rage.wav': gen_barbarian_rage,
    'barbarian-berserker.wav': gen_barbarian_berserker,
    'barbarian-mighty-cleave.wav': gen_barbarian_mighty_cleave,
    'barbarian-iron-skin.wav': gen_barbarian_iron_skin,
    'barbarian-whirlwind.wav': gen_barbarian_whirlwind,
    'barbarian-bloodthirst.wav': gen_barbarian_bloodthirst,

    # Ranger Special Actions
    'ranger-focus.wav': gen_ranger_focus,
    'ranger-pinning-shot.wav': gen_ranger_pinning_shot,
    'ranger-evasive-step.wav': gen_ranger_evasive_step,
    'ranger-multi-shot.wav': gen_ranger_multi_shot,
    'ranger-poison-arrow.wav': gen_ranger_poison_arrow,
    'ranger-sniper-shot.wav': gen_ranger_sniper_shot,
    'ranger-call-companion.wav': gen_ranger_call_companion,

    # Spells (Mage & Witch)
    'spirit-arrow.wav': gen_spirit_arrow,
    'fireball.wav': gen_fireball,
    'fire-wall.wav': gen_fire_wall,
    'ice-shards.wav': gen_ice_shards,
    'ice-storm.wav': gen_ice_storm,
    'heal.wav': gen_heal,
    'healing-aura.wav': gen_healing_aura,
    'fear.wav': gen_fear,
    'terror.wav': gen_terror,
    'shield.wav': gen_shield,
    'shield-wall.wav': gen_shield_wall,
    'strength.wav': gen_strength,
    'strength-aura.wav': gen_strength_aura,
    'lightning.wav': gen_lightning,
    'fire-rain.wav': gen_fire_rain,
    'spirit-guide.wav': gen_spirit_guide,
    'spirit-guardian.wav': gen_spirit_guardian,
    'spirit-warrior.wav': gen_spirit_warrior,
    'raise-dead.wav': gen_raise_dead,
    'animate-corpse.wav': gen_animate_corpse,
    'raise-demon.wav': gen_raise_demon,
    'tangle-twist.wav': gen_tangle_twist,
    'poison-cloud.wav': gen_poison_cloud,
    'time-warp.wav': gen_time_warp,
    'fire-breath.wav': gen_fire_breath,
    'familiar.wav': gen_familiar,
}

# Aliases
ALIASES = {
    'rage.wav': 'barbarian-rage.wav',
    'mighty-cleave.wav': 'barbarian-mighty-cleave.wav',
    'war-cry.wav': 'barbarian-war-cry.wav',
    'iron-skin.wav': 'barbarian-iron-skin.wav',
    'whirlwind.wav': 'barbarian-whirlwind.wav',
    'bloodthirst.wav': 'barbarian-bloodthirst.wav',
    'berserker.wav': 'barbarian-berserker.wav',

    'focus.wav': 'ranger-focus.wav',
    'pinning-shot.wav': 'ranger-pinning-shot.wav',
    'evasive-step.wav': 'ranger-evasive-step.wav',
    'multi-shot.wav': 'ranger-multi-shot.wav',
    'poison-arrow.wav': 'ranger-poison-arrow.wav',
    'sniper-shot.wav': 'ranger-sniper-shot.wav',
    'call-companion.wav': 'ranger-call-companion.wav',

    'melee-attack.wav': 'sword-clash.wav',
    'ranged-attack.wav': 'bow-twang.wav',
    'miss.wav': 'attack-miss.wav',
}

def main():
    print("=================================================================")
    print("Tablerunner Battle Replay Sound Synthesizer (Acoustic DSP)")
    print(f"Target Directory : {os.path.abspath(SOUNDS_DIR)}")
    print("Mode             : Pure Procedural Sound Effects (No Voiceovers)")
    print("=================================================================\n")

    os.makedirs(SOUNDS_DIR, exist_ok=True)
    count = 0

    for filename, fn in GENERATORS.items():
        samples = fn()
        filepath, dur = write_wav(filename, samples)
        print(f"[Synthesized] {filename:30} ({dur*1000:5.0f}ms, {os.path.getsize(filepath):,} bytes)")
        count += 1

    # Aliases
    import shutil
    print("\nCopying convenience aliases...")
    for alias, target in ALIASES.items():
        src = os.path.join(SOUNDS_DIR, target)
        dst = os.path.join(SOUNDS_DIR, alias)
        if os.path.exists(src):
            shutil.copyfile(src, dst)

    print(f"\nFinished! Successfully generated {count} primary sound effects + {len(ALIASES)} aliases.")

if __name__ == '__main__':
    main()
