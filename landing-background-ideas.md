# Landing hero backdrop ideas

Pick one. Instruments keeps the current five-color flow field plus the 120 BPM glow pulse. These are for `index.html` only. All of them reuse the existing Pixi canvas in `js/fx.js`, the five plugin colors (TEW03 yellow, K1X orange, 5HKR magenta, V4JB teal, F4RT green), and fall back to CSS if WebGL or reduced-motion is on. No implementation until you say which number.

## 1. Kick drum rings

Concentric rings expand from a low-left “speaker” point on each quarter at 120 BPM, then fade. Each ring is one plugin color, cycling TEW03 → K1X → 5HKR → V4JB → F4RT. Soft additive strokes, not hard UI circles. Pointer nudges the origin a little so it feels live without becoming a toy.

## 2. Sequencer playhead

A dim 16-step grid sits in the lower third, like a 303/5HKR row seen from far away. A playhead sweeps left to right on the beat. Steps light in plugin colors with a short decay, never busy enough to read as a real sequencer. Pointer can “press” a nearby step, which flashes once and dies.

## 3. Acid saw wall

A few stacked saw-ish polylines span the width, cutoff-bright in the middle, dull at the edges. They drift and squelch slowly; on the beat the brightest line gets a short resonant spike (thicker glow, then back). Colors assigned per voice: yellow and green for the mean one, magenta and teal quieter behind. Pointer warps the nearest vertex like a cutoff knob.

## 4. Fog and partials

V4JB mood: a slow teal/indigo fog field with faint sine-partial ticks rising like dust in a shaft of light. Orange specks (K1X) sit low; green (F4RT) high and rare. Almost no beat unless you want a barely-there 2 Hz breath on the fog alpha. Best if the landing should feel like a pad bed, not a rave flyer.

## 5. Lane rain

Eight sparse columns (5HKR’s lane count) drop short ticks and hats downward, staggered, with swing. Each column locked to one color, two leftover colors used as occasional crashes. Density stays low so the wordmark stays readable. Pointer increases gravity in a small radius, like ducking.

## 6. Morph pad blob

A soft four-corner gradient (yellow, orange, magenta, teal) with green as a slow traveler through the middle. The blob morphs along a looping path the way V4JB’s pad does, not a mouse-follow blob. Pointer biases the path a few percent. Quiet, branded, good if the hero copy should stay king.

## 7. Formant ghosts

Three wide, stacked ellipses (vowel-ish) breathe and shift formant-center left/right. Fill is almost transparent; rims use F4RT green and yellow, with the other plugin colors as inner sparks. On each beat the rims thicken a hair, then recede. Reads as “voice/fart designer” without drawing a cartoon.

## 8. Orbiting logos

Five faint plugin-color orbs orbit a dark center behind the wordmark, different radii and periods so they don’t look like a loading spinner. Trails are short. Beat: orbit speed is constant; glow alpha pulses 120 BPM. Pointer tilts the plane. Risk: can look like a splash screen. Only pick this if you want the family to be the picture.

## 9. Spectrum curtain

A mirrored, very low-resolution spectrum (16–32 bars) sits behind the lede, bars in plugin colors cycling across the width. Motion is a fake but musical envelope (kick on 1, hats on offbeats), not live audio. Bars stay dim; peaks never blow out the text. Classic “this is an audio site” cue, easy to overdo — keep the floor near black.

## 10. Tape / delay repeats

A single bright streak (cream, then plugin colors) writes a short path and leaves decaying echoes offset in time, like a delay dotted to quarter notes at 120 BPM. Feedback is low so the screen doesn’t fill. New streaks spawn rarely. Pointer is the write head. Feels like studio gear without drawing a rack.

## 11. Constellation patch

Points in the five colors, sparse, with occasional thin patch-cable curves connecting two of them. Cables fade in, hold, fade out. No beat, or a tiny flash on the destination node at 120 BPM. Pointer reconnects the nearest cable. Quiet, slightly modular, good neighbor to the landing lede.

## 12. Floor dust

Almost nothing: a dark floor, a few large bokeh blobs in plugin colors, slow drift, 120 BPM so faint you only notice if you stare. The landing copy does the work. Use this if every other idea feels too loud next to the wordmark.
