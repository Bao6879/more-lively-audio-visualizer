# Extended Audio Visualizer

An audio visualizer for [Lively Wallpaper](https://github.com/rocksdanister/lively),
the free Wallpaper Engine alternative. It reacts to whatever you're playing:
circular spectrum, bars, warp and glitch, beat flashes, reactive backgrounds,
and a bunch of one-click genre presets. You can still touch the sliders to get your own version though.

This is a fork of
[eliasfloreteng/lively-audio-visualizer](https://github.com/eliasfloreteng/lively-audio-visualizer). I liked the idea and I wanted more, so I roughly
doubled what it can do, and finished the original author's own to-do list along
the way! Big thanks to elias for the groundwork; see [Credits](#credits).

https://github.com/user-attachments/assets/7af38000-2557-4e41-b12e-1bf90cb0e8b1

```
Track: Disfigure - Blank [NCS Release]
Music provided by NoCopyrightSounds.
Watch: https://www.youtube.com/watch?v=p7ZsBPK656s
Free Download / Stream: https://ncs.io/Blank
```

## Install

1. Grab [Lively Wallpaper](https://www.rocksdanister.com/lively/) if you don't have it (it's free on the Microsoft Store).
2. Download the latest [release](https://github.com/Bao6879/more-lively-audio-visualizer/releases/latest).
3. Drag the `.zip` onto the Lively window.
4. Right-click the wallpaper and hit **Customize** to open everything below.

Pretty much every setting is a slider, checkbox, dropdown, or color picker in
that Customize panel, with one caveat with the slideshow and video.

## What it does

**Five visualizer modes**: Circle, Bottom bars, Mirrored bars, Spectrum line,
Filled area. Set the number of bars (16–256), plus length, width, glow, rounded
caps, bass compensation, and a reactive inner circle. Edge mirror can pin extra
copies of the bars to the screen edges (top/bottom, left/right, or all four).

**Colors**: You can go with the classic static two-color gradient from the OG, a rainbow cycle, or a hue that shifts
with volume. There's also a per-bar gradient, saturation/lightness, and a
kaleidoscope mode (2–8 mirrored segments) for the circle.

**Beat effects**: There's a beat detector under the hood (with sensitivity and
a bass/kick focus) that drives screen shake, teleport-on-beat, a full-screen
beat flash, peak caps and fly-off streaks, and shockwaves you can shape
(ring or line, ten different origins, adjustable thickness/duration/speed).

**Warp & glitch** *(runs on the GPU)*: A beat-driven warp/pinch, RGB
split, slice glitch, and scanlines/VHS. They all share one WebGL pass, so
stacking them doesn't cost extra.

**Backgrounds**: A static image with blur and dim, a slideshow that cycles your
`images/` folder (shuffle + crossfade), or a looping video background (heavy).
The background can react to the beat too: shake, tilt, blur pulse, zoom, in any
combination. And there's the starfield behind everything, which can speed up on
the beat if you want. *(Background and star beat reactions are an idea I borrowed
from [OBLVIION](https://github.com/OBLVIION/lively-audio-visualizer-background-reaction_custom-settings), credits to them.)*

**Placement, motion & a center logo**: Put the visualizer anywhere on screen,
add shake/wobble, smoothing, a constant spin, a beat pulse, auto-hide when it
goes quiet, and a drop shadow. You can also drop in a center logo or image and
place it separately from the visualizer.

**Genre presets**: if you just want it to look good fast, pick one and go:
Chill/Lo-fi, Chillstep, House/DJ, EDM/Festival, Dubstep, Trap, Hardstyle,
Synthwave, or Minimal. There's also 2 that I use personally at the bottom. Do keep in mind that you probably need a relatively good PC to run the heavy version without too much lag. Each one sets the whole look at once, and you can still
nudge any slider afterward.

## Examples (These are presets!)

> **Photosensitivity warning:** this clip has flashing lights, strobing and
> rapid glitch effects. Turn on **Reduce flashing** in Customize to remove the strobe.

https://github.com/user-attachments/assets/3ec64885-e526-424f-b4f6-bc7d9f770486

```
Track: Desmeon - Back From The Dead [NCS Release]

Music provided by NoCopyrightSounds.
Watch: https://www.youtube.com/watch?v=OFWT4yfPdjo
Watch more NCS on YouTube: https://NCS.lnk.to/YouTubeAT
Free Download / Stream: https://ncs.io/bftd
```

## Using your own images, videos & logos

You can either add it directly in customize, with a second step:
- Click the icon under background images to add more images (you can select multiple at the same time). Same with logos and videos.

Or right-click the wallpaper and choose **Open File Location**, then:
- Images go in `images/`, videos in `videos/`, logos in `logos/`.

You then need to pick **Open File Location**, then run generate-playlist.bat so the dropdowns notice the new files.
## Notes:

There's a **Reduce flashing** checkbox that turns off (or damps) the strobe-y
stuff: beat flash, shake, shockwave, glitch. Rapid flashing can be a problem for
photosensitive epilepsy, so if that's a concern for you or whoever's watching,
leave it on. 

The GPU-heavy effects are labeled **(heavy)** next to their
controls.

The videos here will look a bit funky. Github upload size limits, you know.

The rounded bars can lag out the visualizer if you run with a lot of bars (especially kaleidoscope). I've defaulted them to off.

Smoothing on higher levels look very off, so I'd encourage you to lower the settings (bar counts, effects,...), I'll try to fix it soon.

The UI changes size while scrolling up or down, because some areas are wider than others. Might change that.

If you turn off the rotation after a while, the circle doesn't snap back to the normal position. I've labeled it as a feature.

## Troubleshooting

If the visualizer is not reacting to sound, try [this solution](https://help.wallpaperengine.io/en/audio/audiodetection.html#_2-hardware-specific-issues). (Also from the original readme).

If you see that the visualizer is lagging noticeably, you can either shut off all sounds and wait for it to catch back up, then resume; or just end it with task manager then relaunch.

## Credits

- Original project: [eliasfloreteng/lively-audio-visualizer](https://github.com/eliasfloreteng/lively-audio-visualizer): the circular spectrum this is built on.
- Default [video](https://pixabay.com/videos/sunset-blender-mountains-river-3d-65182/) by _Pabliyo.
- Background and starfield beat reactions: ideas from [OBLVIION](https://github.com/OBLVIION/lively-audio-visualizer-background-reaction_custom-settings).
- [Lively Wallpaper](https://github.com/rocksdanister/lively) by rocksdanister.
- The other images and logos came from the original project.
- Demo music (NCS): **Disfigure – Blank** (https://ncs.io/Blank) and **Desmeon – Back From The Dead** (https://ncs.io/bftd). Music provided by NoCopyrightSounds.

The original doesn't ship with a license, but the author gave permission to reuse the code [in this comment](https://github.com/eliasfloreteng/lively-audio-visualizer/issues/9#issuecomment-4851175795). This fork is released under the [MIT license](LICENSE), with credit to everyone above.

Full version history is in [`changelog.md`](changelog.md).
