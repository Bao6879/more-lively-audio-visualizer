# Changelog

All notable changes to this fork are documented here. This is an extended fork
of [elias123tre/lively-audio-visualizer](https://github.com/elias123tre/lively-audio-visualizer),
a circular audio-spectrum visualizer for [Lively Wallpaper](https://github.com/rocksdanister/lively).

## [0.8.0]: 2026-07-02
### Added
- **Author's choice (heavy)** preset: my maxed-out look (8-way
  kaleidoscope, fat volume-reactive bars, warp + RGB split + slice glitch + beat
  flash + shockwave, background & star beat reactions). Deliberately heavy. **MASSIVE EPILEPSY WARNING**.
- **Author's choice (chill)** preset: my own laid-back look
  (edge-mirrored bottom bars, rainbow cycle, peak caps, gentle background tilt).
- **MIT `LICENSE`.** The original author granted permission to reuse the code
  (WTFPL).

### Changed
- **Rounded bars is now OFF by default.** Round line caps get expensive when the
  bars are wide and glow is high.

### Fixed
- **Peak fly-off now works with Kaleidoscope.** they now spawn from every wedge and radiate symmetrically like the
  bars do.

### Added: Genre presets (Batch 8, part 1)
- **Preset** dropdown (Customize → top, "PRESETS"): one click sets a whole look!

## [0.7.2]: 2026-07-02
### Changed: Beat reactions reworked
- **Background reactions are now four independent checkboxes** (Shake / Tilt /
  Blur pulse / Zoom) instead of a single dropdown, so they can be combined. The
  standalone **Beat zoom** is gone: its swell is now the **Background zoom on
  beat** checkbox; all four share one **Background reaction strength** slider.
- **Shake and Tilt are now volume-driven, not beat-driven**: they track the
  loudness continuously, so a tilt leans and *holds* while the music stays loud
  and eases back as it quiets, and shake scales with volume. A new **Shake/tilt
  volume threshold** slider gates both. **Blur pulse and Zoom stay beat-driven.**
- **Tilt is distinct from Shake**: a smooth, eased lean with a tiny zoom-out
  versus Shake's per-frame jitter.
- **Fixed a shake "zoom snap"**: the background used to zoom in slightly while
  shaking and snap back to normal size when it stopped. The overscale that hides
  shifted edges is now constant while Shake/Tilt are enabled, so there's no snap.
- **Stars now "accelerate on beat"** with vibration made optional: the surge is
  clean by default; a new **Also vibrate star position on beat** checkbox
  re-enables the positional jolt.
- **Customize panel reorganized.**

## [0.7.1]: 2026-07-02
### Added: Beat reactions, idea by OBLIVIION (Batch 7 complete)
Two beat reactions borrowed from OBLIVIION's fork, credited in the Customize
panel at the controls. Will be credited with links in the readme when that's done.
- **Background beat reactions** (Customize → "Background extras:"): a
  **Background reacts on beat** checkbox, a **Background reaction** dropdown
  (Shake / Tilt / Blur pulse / Zoom), and a **Background reaction strength**
  slider. The background wrapper kicks on each detected beat and eases back;
  since it's the wrapper, a selected video background reacts too. Composed with
  the existing **Beat zoom** into one transform/filter so they don't fight, and
  damped by **Reduce flashing**.
- **Starfield beat reactions** (Customize → "Background stars:"): a **Stars
  react on beat** checkbox + **Star beat reaction strength** slider. On each
  beat the stars surge forward and the whole field takes a positional jolt, both
  easing back. Also damped by **Reduce flashing**.

## [0.7.0]: 2026-07-02
### Added: More energy & reactivity (Batch 7, part 1)
The three self-contained effects of Batch 7. The two fork-borrowed ideas
(background-on-beat, starfield-on-beat) are deferred until we have the
attribution to credit in the UI.
- **Beat flash** (Customize → beat section): a **Beat flash** checkbox, a
  **Beat flash color** picker, and a **Beat flash strength** slider. On each
  detected beat a full-screen colour flash pops above the background (screen
  blend) and behind the visualizer, then decays. 
- **Reduce flashing disables it entirely**: it's a strobe by definition, not just motion.
- **Teleport on beat** (Customize → beat section): a **Teleport on beat**
  checkbox. Instead of vibrating in place (Screen shake), the visualizer jumps
  to a new on-screen spot on each beat and holds there until the next one. Kept
  within a margin so the ring stays fully visible.
- **Peak fly-off** (Customize → "Bars:"): a **Peak fly-off** checkbox +
  **Peak fly-off sensitivity** slider. When a bar spikes up fast enough its peak
  cap launches off toward the screen edge, leaving a short fading streak.
  Independent of the falling **Peak caps**;
- **Peak fly-off speed** slider (Customize → "Bars:"): controls how fast a
  launched cap flies off .
### Changed
- **Peak fly-off** now lets a single bar stack multiple caps in flight.

## [0.6.1]: 2026-07-02
### Added: Background extras, part 2 (Batch 6 complete)
- **Video background (heavy)**: a **Video background** checkbox + **Background
  video** dropdown (Customize → "Background extras:"). Drop `.mp4`/`.webm` files
  in a new `videos/` folder, run `generate-playlist.bat`, and pick one; it loops
  muted behind everything. Sits inside the background wrapper, so **background
  blur and beat zoom apply to it too**.
- **Current Video Credit**: https://pixabay.com/videos/sunset-blender-mountains-river-3d-65182/
- **Shockwave, reworked** (Customize → beat section): the old fixed centered
  ring is now fully configurable:
  - **Shockwave shape**: Ring (expanding circle) or Line (a straight bar that
    sweeps across the screen).
  - **Shockwave origin**: Center / the four sides / the four corners / Random.
    Edge and corner origins send the wave sweeping in from that edge; the Center
    line sweeps out both ways.
  - **Shockwave thickness**, **duration**, and **speed** sliders.

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
