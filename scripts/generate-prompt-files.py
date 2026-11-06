"""
Generate individual ComfyUI audio prompt text files for all sound effects in Tablerunner.
Each file is named <sound-name>.txt and placed in public/sounds/.
"""

import os

SOUNDS_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'sounds')

# Mapping of primary sound files to their sound design prompts for ComfyUI
PROMPTS = {
    # Melee & Physical Combat Foley
    'sword-clash.txt': (
        "Sharp, realistic steel sword clash impact, two heavy medieval longsword blades striking hard "
        "against each other, metallic friction scrape, high-frequency steel bite with ringing metallic harmonic decay, "
        "close-up studio combat foley, snappy punchy transient, clean sound effect, no music."
    ),
    'bow-twang.txt': (
        "Realistic medieval wooden recurve bow release, taut string snapping sharply with woody resonance, "
        "followed by a fast whistling arrow whoosh through the air, snappy attack, clean studio foley, no music, no background noise."
    ),
    'potion-drink.txt': (
        "Crisp glass potion vial cork unstopping pop, followed by two fast realistic liquid gulping and swallowing sounds, "
        "subtle liquid sloshing, clean studio foley, close-up, snappy, no music."
    ),
    'attack-miss.txt': (
        "Fast aggressive whoosh of a heavy melee blade cutting through thin air, sharp wind displacement swoosh, "
        "sudden airy whip transient, clean combat foley, snappy, no hit impact, no music."
    ),
    'defeat.txt': (
        "Heavy body falling and collapsing onto dirt and gravel ground, armor clattering upon impact, "
        "deep low-frequency thud, breathless dying gasp, dark dramatic combat defeat sound effect, no music."
    ),

    # Barbarian Vocal Actions (Actual Barbarian Shouting / Roaring)
    'barbarian-war-cry.txt': (
        "Fierce male barbarian warrior shouting a ferocious guttural battle roar, deep booming masculine war cry, "
        "intense aggressive battle rally yell, raw powerful vocalization, echoing combat hall acoustics, clean isolated voice, no background music."
    ),
    'barbarian-rage.txt': (
        "Aggressive muscular barbarian warrior entering a berserk fury, deep guttural throat growl surging into "
        "an explosive enraged shout and furious heavy panting, raw human voice, intense adrenaline, clean combat vocal foley, no music."
    ),
    'barbarian-berserker.txt': (
        "Savage bloodthirsty barbarian warrior screaming in unhinged battle frenzy, furious aggressive screaming roar "
        "with teeth grinding and breathless battle intensity, cinematic warrior vocal sound effect, clean isolated, no music."
    ),
    'barbarian-mighty-cleave.txt': (
        "Muscular male barbarian shouting a forceful exertion grunt paired with the heavy sonic whoosh and crushing impact "
        "of a massive two-handed battleaxe slicing through armor, brutal combat strike, clean foley, no music."
    ),
    'barbarian-iron-skin.txt': (
        "Deep booming barbarian chest-beating grunt and roar of defiance, layered with a resonant metallic clinking "
        "and heavy anvil chime resonating as skin turns to solid steel, punchy bass, clean sound effect."
    ),
    'barbarian-whirlwind.txt': (
        "Violent swirling vortex of spinning steel blades whistling rapidly through the air, heavy multi-directional air swooshes "
        "layered with an aggressive warrior battle shout, fast dynamic spinning foley, no music."
    ),
    'barbarian-bloodthirst.txt': (
        "Predatory savage warrior battle snarl, aggressive guttural roar layered with a wet visceral blade slash sound effect, "
        "raw ferocious energy, clean combat foley, no music."
    ),

    # Ranger Special Actions
    'ranger-focus.txt': (
        "Focused archer taking a deep calm breath and exhalation, wood bowstring stretching under high tension, "
        "high-pitched subtle temporal hum of heightened perception and pinpoint accuracy, clean foley, no music."
    ),
    'ranger-pinning-shot.txt': (
        "High-tension longbow shot releasing with a heavy wooden crack, sharp high-velocity whistling arrow flight, "
        "ending in a violent thud of an arrow impaling deeply into solid wood and stone, pinning the target, clean combat foley."
    ),
    'ranger-evasive-step.txt': (
        "Rapid agile combat dodge, quick leather boot scuff across dirt and stone, light cloth flapping whoosh, "
        "swift evasive roll, clean tactical foley, snappy, no music."
    ),
    'ranger-multi-shot.txt': (
        "Rapid sequential release of multiple bowstrings in quick succession, three distinct sharp wooden twangs "
        "followed by overlapping whistling arrow whooshes through the air, crisp dynamic archery foley."
    ),
    'ranger-poison-arrow.txt': (
        "Snappy bowstring release, hissing aerodynamic arrow whistling with a toxic dripping sizzle, "
        "liquid venom dripping on impact with acrid bubbling hiss, dark tactical foley, no music."
    ),
    'ranger-sniper-shot.txt': (
        "Tremendous powerful compound bow release, sonic crack shockwave, piercing supersonic arrow shrieking through the distance, "
        "distant resonant target penetration, high-impact precision archery foley."
    ),
    'ranger-call-companion.txt': (
        "Piercing high-pitched hunter whistle echo, followed immediately by the aggressive roar of an approaching predatory wolf "
        "or great beast rushing into battle, rustling foliage, clean wildlife combat foley."
    ),

    # Elemental & Offensive Spells
    'spirit-arrow.txt': (
        "Ethereal spectral bow release, ghostly luminous arrow whistling with a shimmering otherworldly trail, "
        "resonant celestial chime on impact, ghostly magical archery sound effect."
    ),
    'fireball.txt': (
        "Magical roaring fireball whoosh launching forward, accelerating with crackling flames, "
        "ending in a powerful explosive fiery blast with low-end sub rumble and scattering ember sparks, clean fantasy spell sound effect."
    ),
    'fire-wall.txt': (
        "Sudden roaring ignition of an imposing barrier of flames, sustained turbulent crackling inferno, "
        "fiery whooshing surges, intense thermal rumbling, clean magical fire foley, no music."
    ),
    'ice-shards.txt': (
        "Crystalline freezing charge-up, followed by the rapid-fire launch and shattering impact of jagged frozen icicles "
        "smashing against hard surface, high-frequency glass-like ice cracking and scattering shards."
    ),
    'ice-storm.txt': (
        "Violent howling blizzard gust, freezing icy wind turbulence swirling rapidly with constant crystalline hail peltings "
        "and deep glacial sub-bass freezing rumble, cold magical atmospheric foley."
    ),
    'heal.txt': (
        "Gentle soothing restorative chime cascade, warm divine healing glow, rising harmonic frequencies, "
        "sparkling liquid light blessing, clean peaceful recovery sound effect."
    ),
    'healing-aura.txt': (
        "Expansive celestial healing wave, pulsating shimmering light, warm bell harmonics echoing outward "
        "with soft gentle wind chimes and rejuvenating essence, magical support spell foley."
    ),
    'fear.txt': (
        "Eerie spectral wail shrieking through the shadows, unnerving dissonant phantom screech, "
        "sudden cold shivering auditory shock, dark psychological horror spell effect, no music."
    ),
    'terror.txt': (
        "Overwhelming visceral panic shockwave, deafening terrifying monstrous scream layered with rapid pounding heartbeat "
        "and descending dark drone, pure psychological terror foley."
    ),
    'shield.txt': (
        "Resonant ethereal magical barrier activating, harmonious glowing crystalline chime expanding into "
        "a protective energy forcefield hum, clean mystical defense sound effect."
    ),
    'shield-wall.txt': (
        "Heavy metallic phalanx impact, large steel tower shields locking together in unison with solid clangs, "
        "fortified energy resonance ringing out, massive defensive wall formation foley."
    ),
    'strength.txt': (
        "Surging magical empowerment burst, deep muscular low-frequency bass swell, rising energetic shimmer "
        "and resonant power surge, triumphant buff sound effect, clean foley."
    ),
    'strength-aura.txt': (
        "Warm pulsating radiant energy aura, continuous harmonic power hum with gentle rhythmic bass throbs "
        "and sparkling celestial resonance, uplifting magical enchantment foley."
    ),
    'lightning.txt': (
        "Sharp deafening electrical crackle and blinding lightning bolt strike, instantaneous high-voltage arc zap "
        "followed immediately by a booming thunder clap shockwave, crisp punchy transient, no music."
    ),
    'fire-rain.txt': (
        "Cascading barrage of falling meteors and flaming projectiles shrieking down from the sky, "
        "multiple consecutive fiery explosive impacts and rumbling detonations across the battlefield, epic magical foley."
    ),
    'spirit-guide.txt': (
        "Mystical ancestral spirit whisper, shimmering wind chime fluttering, soft ethereal luminous entity manifesting "
        "with gentle celestial resonance, sacred guiding spell foley."
    ),
    'spirit-guardian.txt': (
        "Powerful ethereal warrior spirit materializing, booming spectral shockwave, radiant otherworldly sword drawn "
        "with celestial ringing harmonics, majestic summon sound effect."
    ),
    'spirit-warrior.txt': (
        "Ghostly ethereal warrior charging forward with a phantom battle shout, clashing translucent spectral weapons, "
        "shimmering harmonic phasing, clean mystical combat foley."
    ),
    'raise-dead.txt': (
        "Ancient dark necromancy surge, crumbling graveyard earth moving and clattering bones, eerie low necrotic chant, "
        "skeletal hands bursting up through soil, undead rising foley."
    ),
    'animate-corpse.txt': (
        "Macabre necromantic stitching hum, crackling dark electric soul infusion, sickening bone relocation click "
        "and deep guttural undead awakening moan, dark magic foley."
    ),
    'raise-demon.txt': (
        "Terrifying hellish abyssal portal tearing open, crackling brimstone eruption, deafening monstrous demonic roar "
        "emerging from the underworld with shaking sub-bass roar, epic infernal summon foley."
    ),
    'tangle-twist.txt': (
        "Violent sudden growth and twisting of thorny vines, heavy wood creaking, snapping branches, "
        "rustling leafy undergrowth tightening around target with constriction stress, naturalistic spell foley."
    ),
    'poison-cloud.txt': (
        "Pressurized venomous cloud releasing with a deep hissing vapor spray, noxious bubbling liquid sizzle, "
        "toxic gaseous expanding envelope, dark alchemical magic foley, no music."
    ),
    'time-warp.txt': (
        "Mind-bending magical time distortion, high-frequency temporal phase sweep, descending pitch shift warp, "
        "reverse whoosh into a crystalline echoing chime pulse, sci-fi fantasy spell foley."
    ),
    'fire-breath.txt': (
        "Guttural monstrous draconic inhale followed by an immense continuous torrent of roaring flamethrower fire "
        "erupting forward, blistering thermal roar, deep sub bass, clean fantasy dragon breath foley."
    ),
    'familiar.txt': (
        "Playful mystical summoning puff of smoke, soft magical sparkle pop, small mythical creature chirp "
        "and wing flutter, cute magical companion manifestation foley."
    ),
}

# Aliases matching target audio files
ALIASES = {
    'rage.txt': 'barbarian-rage.txt',
    'mighty-cleave.txt': 'barbarian-mighty-cleave.txt',
    'war-cry.txt': 'barbarian-war-cry.txt',
    'iron-skin.txt': 'barbarian-iron-skin.txt',
    'whirlwind.txt': 'barbarian-whirlwind.txt',
    'bloodthirst.txt': 'barbarian-bloodthirst.txt',
    'berserker.txt': 'barbarian-berserker.txt',

    'focus.txt': 'ranger-focus.txt',
    'pinning-shot.txt': 'ranger-pinning-shot.txt',
    'evasive-step.txt': 'ranger-evasive-step.txt',
    'multi-shot.txt': 'ranger-multi-shot.txt',
    'poison-arrow.txt': 'ranger-poison-arrow.txt',
    'sniper-shot.txt': 'ranger-sniper-shot.txt',
    'call-companion.txt': 'ranger-call-companion.txt',

    'melee-attack.txt': 'sword-clash.txt',
    'ranged-attack.txt': 'bow-twang.txt',
    'miss.txt': 'attack-miss.txt',
}

def main():
    os.makedirs(SOUNDS_DIR, exist_ok=True)
    count = 0

    # Write primary prompt files
    for filename, prompt in PROMPTS.items():
        filepath = os.path.join(SOUNDS_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(prompt.strip() + '\n')
        print(f"[Created] {filename:30} -> {filepath}")
        count += 1

    # Write aliases
    for alias_name, target_name in ALIASES.items():
        if target_name in PROMPTS:
            filepath = os.path.join(SOUNDS_DIR, alias_name)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(PROMPTS[target_name].strip() + '\n')
            print(f"[Alias]   {alias_name:30} -> matches {target_name}")
            count += 1

    print(f"\nDone! Generated {count} plain text prompt files in {os.path.abspath(SOUNDS_DIR)}.")

if __name__ == '__main__':
    main()

