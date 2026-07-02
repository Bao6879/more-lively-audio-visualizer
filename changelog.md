# Changelog

All notable changes to this fork are documented here. This is an extended fork
of [elias123tre/lively-audio-visualizer](https://github.com/elias123tre/lively-audio-visualizer),
a circular audio-spectrum visualizer for [Lively Wallpaper](https://github.com/rocksdanister/lively).


## [0.6.0]: 2026-07-02
### Added: Background extras, part 1 (Customize → "Background extras:")
First slice of Batch 6.
- **Beat zoom** checkbox + **Beat zoom strength** slider: the background image
  layer swells on each detected beat and eases back to rest. Respects **Reduce
  flashing**, which damps the swell.

### Fixed
- **Background dim** now actually works.

### Changed
- Tripled the ceiling on the glitch effects: **RGB split** and **Slice glitch**

## [0.5.0]: 2026-07-02
### Added: Warp on beat (Customize → "Warp & glitch (heavy):")
- **Warp: contract/release on beat (GPU)** checkbox: each detected beat fires a
  fast pinch centered on the visualizer: the middle gets sucked inward, then
  bulges back out ~20% past rest and snaps to normal, all in a fraction of a
  second. It's a lens: the distortion is strongest at the center and fades to
  nothing toward the screen edges, so the surroundings warp around the pull
  rather than the whole image zooming uniformly. Driven by the same beat detector
  as the shake/shockwave.
- **Warp hit strength** slider: how hard the center gets pulled in.
- **Warp pulse duration** slider: how long the pinch lasts (all snappy; higher =
  slightly longer contract/release).
- Respects the existing **Reduce flashing (accessibility)** toggle, which damps
  the pinch strength alongside the beat shake/shockwave.

## [0.4.3]: 2026-07-01
### Added
- **Peak fall speed** slider: controls how fast the peak markers drop.

## [0.4.2]: 2026-07-01
### Added
- **Peak caps (falling markers)** checkbox (Customize → "Bars:"): each bar gets
  a marker that jumps to its peak and then falls under gravity. Works in the
  circle, bottom/mirrored bar, and edge-mirror modes (not the line/area modes,
  which have no discrete bars).

## [0.4.1]: 2026-07-01
### Changed
- **Screen shake on beat**: increased the maximum shake magnitude by ~50% for a
  harder hit at the top of the slider's range.

## [0.4.0]: 2026-07-01
### Added: Beat-reactive effects (Customize → "Beat-reactive:")
- **Beat detection**: fires when the loudness spikes above a slow rolling
  baseline, with a short cooldown so a single hit doesn't double-trigger.
- **Beat sensitivity** slider: higher lowers the threshold (more beats).
- **Bass isolation (kick focus)** slider: 0 reacts to the whole spectrum, 100
  focuses the reaction on the low ~10% of bands so kicks/808s drive it.
- **Screen shake on beat** slider: a quick positional kick on each beat that
  decays over a few frames (separate from the continuous shake/wobble).
- **Shockwave ripple on beat** checkbox: an expanding ring from the visualizer
  center on each beat, tinted to the current color settings.
- **Reduce flashing (accessibility)** checkbox: damps the beat shake and
  shockwave intensity. Photosensitivity-friendly; future heavy glitch/strobe
  effects will hook into this same toggle.

## [0.3.0]: 2026-06-30
### Added: Visualizer modes & layout
- **Visualizer mode** dropdown (Customize → "Bars:"): Circle / Bottom bars /
  Mirrored bars / Spectrum line / Filled area. Note: "line" and "area" trace the
  frequency *spectrum*, not a time-domain waveform (Lively only exposes spectrum
  data), and are labeled accordingly.
- **Edge mirror** dropdown (bar modes only): Off / Top + bottom / Left + right /
  All 4 sides. Anchors inward-growing copies of the bars to the screen edges;
  one row of each opposing pair is flipped so the pair mirrors each other.
- **Center image position**: Horizontal/Vertical sliders so the center logo can
  be placed independently of the visualizer instead of following it and its shake.

## [0.2.0]: 2026-06-30
### Added: Color & style
- **Color mode** dropdown (Customize → "Colors:"): Static gradient / Rainbow
  cycle / Volume-reactive hue.
- **Rainbow / shift speed** slider: drives the rainbow sweep and the
  volume-reactive hue shift.
- **Gradient along each bar** checkbox: fades each bar dim→bright along its length.
- **Kaleidoscope segments** dropdown (circle only): Off / 2 / 3 / 4 / 6 / 8;
  folds the ring into mirrored rotational wedges.

## [0.1.0]: 2026-06-30
### Added: Fork foundation & motion
- **Number of bars** slider (16–256): replaces the original dedup hack with a
  clean resample of the 128-band array into exactly N buckets (Customize → "Bars:").
- **Background slideshow** (Customize → "Background slideshow:"): cycle through
  the `images/` folder: enable, seconds per image, shuffle, and crossfade
  duration. Uses the `playlist.js` pattern with two-layer crossfade + preloading;
  falls back to the static background image when off or empty.
- **Motion & reactivity** (Customize → "Motion & reactivity:"):
  - **Smoothing**: eases each bar toward its target so they stop jumping.
  - **Constant rotation speed**: steady spin of the whole ring (circle mode).
  - **Beat pulse**: smoothly scales the whole visualizer up on loud moments.
  - **Auto-hide on silence**: fades the visualizer out below a loudness threshold.
  - **Background dim**: darkens the background so the bars pop.

---

## Fork baseline (inherited from upstream)
Provided by the original project and left intact: circular spectrum, bar
length/width/glow/rounded caps, inner radius & reactivity, bass compensation,
top/bottom hue with saturation/lightness, shake/wobble, starfield
(color/opacity/glow/blur), visualizer position X/Y, drop shadow, background image
with blur, and the center logo image. Credit to
[elias123tre](https://github.com/elias123tre/lively-audio-visualizer).
