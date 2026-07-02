let innerPercent = 50
let innerRadius = 270
let barPercent = 50
let maxLength = 1080 / 2 - innerRadius
let barWidth = 75
let startHue = 0
let endHue = 180
let saturation = 50
let lightness = 50
let compensation = 50
let glow = 10
let innerMovement = 25
let barCount = 128 // total number of bars (even number). Set via "Number of bars".

let showStars = true
let starColor = "#FFFFFF"
let starOpacity = 50
let starGlow = 15

let xPercent = 50
let yPercent = 50
let logoXPercent = 50 // center image position, independent of the visualizer
let logoYPercent = 50
let movementSpeed = 50
let movementRadius = 15
let roundedBars = false

let shadowX = 8
let shadowY = 8
let shadowBlur = 10
let shadowOpacity = 70

// --- Batch 1: motion & reactivity -------------------------------------------
let rotationSpeed = 0 // constant spin of the whole visualizer (0 = off)
let smoothing = 40 // 0 = instant/jumpy, higher = smoother/laggier bars
let beatPulse = 0 // whole-visualizer scale on loud moments (0 = off)
let autoHideThreshold = 0 // fade visualizer out below this loudness (0 = off)
let bgDim = 0 // darken the background to make bars pop (0 = off)

// --- Batch 2: color & style -------------------------------------------------
let colorMode = 0 // 0 = static gradient, 1 = rainbow cycle, 2 = volume-reactive hue
let rainbowSpeed = 30 // rainbow sweep speed; also scales the hue shift in volume mode
let barGradient = false // fade each bar's color along its length (inner -> outer)
let symmetry = 1 // rotational kaleidoscope segments (1 = off; 2/3/4/6/8)

// --- Batch 3: visualizer modes ----------------------------------------------
let vizMode = 0 // 0 circle, 1 bottom bars, 2 mirrored bars, 3 spectrum line, 4 filled area
let edgeMirror = 0 // bar modes only: 0 off, 1 top+bottom, 2 left+right, 3 all four sides

// --- Batch 4: beat-reactive extras ------------------------------------------
let beatSensitivity = 50 // higher = triggers beats more readily
let bassIsolation = 0 // 0 = react to whole spectrum, 100 = only the low bands
let beatShake = 0 // positional kick on detected beats (0 = off)
let shockwaveEnabled = false // expanding ripple from an origin on beats
let shockwaveOrigin = 0 // 0 center, 1-4 sides, 5-8 corners, 9 random
let shockwaveShape = 0 // 0 = ring (expanding circle), 1 = line (sweeping bar)
let shockwaveThickness = 3 // stroke width in px
let shockwaveDuration = 40 // how long each wave lives (0-100 → frames)
let shockwaveSpeed = 40 // how fast it travels (0-100 → px/frame)
let reduceFlashing = false // accessibility: damp flashing / rapid motion

let peakCaps = false // per-bar peak markers that hold, then fall under gravity

// --- Batch 5: warp & glitch -------------------------------------------------
// Warp is a beat-driven contract-then-release: each beat implodes the whole
// image toward the visualizer center, then it bounces back out and settles.
// It's a single time-based radial *scale* (uniform for every pixel), not a
// travelling ring — so the image can never appear at two radii at once (the
// old sine-ring shader duplicated the circle). Rendered on the GPU (WebGL):
// the 2D canvas is fed in as a texture and a fragment shader scales the lookup
// radially, so it's cheap even full-screen (the old SVG feDisplacementMap was
// CPU-bound and slow).
let warpEnabled = false
let warpAmount = 40 // hit strength: how far the image contracts on a beat (0 = off)
let warpDetail = 40 // pulse duration: longer = slower, springier contract/release
let warpRipples = [] // active pulses: { f: age frames, strength: 0..1 }
let warpActive = false // is the GL overlay currently shown (source hidden)

// Glitch rack (all rendered in the same GL overlay as warp)
let rgbSplitEnabled = false
let rgbSplitAmount = 50 // chromatic-aberration strength on loud hits
let sliceGlitchEnabled = false
let sliceGlitchAmount = 50 // how far slice bands jump on a beat
let scanlinesEnabled = false
let scanlineAmount = 40 // scanline/VHS darkening intensity
let aberrLevel = 0 // current (decaying) aberration in px
let sliceLevel = 0 // current (decaying) slice shift in px
let glitchSeed = 0 // reshuffled each beat so slice bands change

let beatEnergyAvg = 0 // slow rolling loudness baseline for beat detection
let beatCooldownFrames = 0 // min-gap counter so one beat doesn't double-trigger
let shakeImpulse = 0 // decaying beat-shake magnitude
let shockwaves = [] // active waves: { ox, oy, dx, dy, center, dist, a0, age }

// Resolve a shockwave origin index to a point (ox,oy) plus a travel direction
// (dx,dy) used by the Line shape. `center` flags the middle origin, which sweeps
// out both ways. cx/cy are the live visualizer center (used by the Center origin).
const SQRT1_2 = Math.SQRT1_2
function shockOrigin(idx, w, h, cx, cy) {
  switch (idx) {
    case 1: return { ox: w / 2, oy: 0, dx: 0, dy: 1 } // top → sweeps down
    case 2: return { ox: w / 2, oy: h, dx: 0, dy: -1 } // bottom → up
    case 3: return { ox: 0, oy: h / 2, dx: 1, dy: 0 } // left → right
    case 4: return { ox: w, oy: h / 2, dx: -1, dy: 0 } // right → left
    case 5: return { ox: 0, oy: 0, dx: SQRT1_2, dy: SQRT1_2 } // top-left
    case 6: return { ox: w, oy: 0, dx: -SQRT1_2, dy: SQRT1_2 } // top-right
    case 7: return { ox: 0, oy: h, dx: SQRT1_2, dy: -SQRT1_2 } // bottom-left
    case 8: return { ox: w, oy: h, dx: -SQRT1_2, dy: -SQRT1_2 } // bottom-right
    case 9: return { ox: Math.random() * w, oy: Math.random() * h, dx: 0, dy: 1 } // random
    default: return { ox: cx, oy: cy, dx: 0, dy: 1, center: true } // center
  }
}
let peaks = [] // persistent per-bar peak value, aligned to `spectrum`
let peakGravity = 0.01 // how far a peak marker falls per frame (set via "Peak fall speed")

// --- Batch 7: more energy & reactivity --------------------------------------
// Beat flash: a full-screen colour flash on each beat (DOM overlay #beat-flash),
// above the background but below the visualizer. Reduce flashing kills it.
let beatFlashEnabled = false
let beatFlashColor = "#ffffff"
let beatFlashStrength = 60 // peak flash opacity (0-100)
let flashLevel = 0 // current, decaying flash opacity

// Teleport on beat: instead of vibrating in place, the ring jumps to a new spot
// on each beat and stays there until the next one (distinct from beatShake).
let beatTeleport = false
let teleportX = 0.5 // current teleport target as a fraction of width/height
let teleportY = 0.5

// Peak fly-off: when a bar spikes up hard/fast, its peak cap launches off toward
// the screen edge, leaving a fading streak. Independent of the falling peakCaps.
let peakFlyOff = false
let peakFlySensitivity = 50 // higher = a smaller jump triggers a fly-off
let peakFlySpeed = 50 // how fast a launched cap flies off (0-100)
let flyingCaps = [] // active streaks: { x, y, vx, vy, age, life, hue }
let flyTrigger = [] // per-band: did this bar spike hard enough this frame
let flyCooldown = [] // per-band cooldown frames so a held-loud bar doesn't spam
let prevSpectrum = [] // last frame's spectrum, for spike detection

let globalRotation = 0 // accumulated rotation, radians
let rainbowOffset = 0 // accumulated hue offset for the rainbow cycle
let smoothedAudio = [] // persistent buffer for bar smoothing
let pulseScale = 1 // smoothed scale factor for beat pulse

const debug = document.getElementById("debug")
const middle = document.getElementById("middle")
const canvas = document.getElementById("canvas")
const visualizer = document.getElementById("visualizer")
const starfield = document.getElementById("starfield")
const beatFlash = document.getElementById("beat-flash")

// Batch 7: launch a peak cap streak from (x,y) heading in direction (dx,dy).
// Speed is fixed; the streak fades over its short life. Capped so a wall of
// spikes can't grow the array unbounded.
function spawnFlyCap(x, y, dx, dy, hue) {
  let len = Math.hypot(dx, dy) || 1
  let speed = 5 + (peakFlySpeed / 100) * 27 // ~5–32 px/frame
  flyingCaps.push({ x, y, vx: (dx / len) * speed, vy: (dy / len) * speed, age: 0, life: 34, hue })
  if (flyingCaps.length > 200) flyingCaps.shift()
}

// ----------------------------------------------------------------------------
// Batch 5: GPU warp (WebGL droplet ripples)
// ----------------------------------------------------------------------------
// The 2D visualizer canvas is uploaded as a texture; a fragment shader pinches
// each pixel's lookup radially about the visualizer center. The pinch strength
// (u_k) is weighted by a Gaussian bump that's strongest at the center and
// falls off to nothing by u_radius — so the middle gets sucked in / warped hard
// while the far surroundings stay put. It's a lens, not a uniform zoom, and
// there's no travelling wave to duplicate the circle.
const glcanvas = document.getElementById("glcanvas")
let gl = null
let glProg = null
let glTex = null
let glQuad = null
let glLoc = {}
let glInitFailed = false

const WARP_VERT = `
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`

const WARP_FRAG = `
precision highp float;
uniform sampler2D u_tex;
uniform vec2 u_res;
uniform vec2 u_center;
uniform float u_k;       // warp pinch: >0 suck toward center, <0 bulge out
uniform float u_radius;  // px radius over which the pinch fades to nothing
uniform float u_aberr;   // chromatic aberration: px the R/B channels split by
uniform float u_slice;   // slice glitch: max px a horizontal band shifts sideways
uniform float u_seed;    // reshuffles the slice bands (bumped each beat)
uniform float u_scan;    // scanline/VHS darkening, 0..1
varying vec2 v_uv;
float hash(float n) { return fract(sin(n) * 43758.5453); }
void main() {
  // Pixel coord with top-left origin (matches u_center = visualizer center)
  vec2 px = vec2(v_uv.x * u_res.x, (1.0 - v_uv.y) * u_res.y);
  // Warp pinch: scale the lookup radially, weighted toward the center.
  vec2 d = px - u_center;
  float r = length(d);
  float nr = r / u_radius;
  float bump = exp(-nr * nr * 2.0);      // 1 at center, ~0 by u_radius
  float srcR = r * (1.0 + u_k * bump);   // sample farther out near center = suck in
  vec2 src = u_center + (d / max(r, 0.0001)) * srcR;
  // Slice glitch: nudge whole ~24px horizontal bands sideways at random.
  if (u_slice > 0.0) {
    float band = floor(src.y / 24.0);
    if (hash(band * 1.7 + u_seed) > 0.6) {
      src.x += (hash(band * 3.1 + u_seed) - 0.5) * u_slice;
    }
  }
  vec2 uv = src / u_res;
  // Chromatic aberration: pull the red/blue channels apart horizontally.
  vec4 col;
  if (u_aberr > 0.0) {
    vec2 o = vec2(u_aberr / u_res.x, 0.0);
    col = vec4(texture2D(u_tex, uv + o).r,
               texture2D(u_tex, uv).g,
               texture2D(u_tex, uv - o).b,
               texture2D(u_tex, uv).a);
  } else {
    col = texture2D(u_tex, uv);
  }
  // Scanlines: darken alternating rows for a VHS/CRT feel.
  if (u_scan > 0.0) {
    float lines = 0.5 + 0.5 * sin(px.y * 2.0943); // ~3px period
    col.rgb *= mix(1.0, lines, u_scan);
  }
  gl_FragColor = col;
}`

function compileShader(type, src) {
  let sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("Warp shader error:", gl.getShaderInfoLog(sh))
    return null
  }
  return sh
}

// Lazily bring up WebGL the first time warp is enabled. Returns false (and sets
// glInitFailed) if the context or shaders aren't available, so warp no-ops
// gracefully instead of throwing every frame.
function initWarpGL() {
  if (gl || glInitFailed) return !!gl
  glcanvas.width = canvas.width
  glcanvas.height = canvas.height
  gl = glcanvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) {
    glInitFailed = true
    return false
  }
  let vs = compileShader(gl.VERTEX_SHADER, WARP_VERT)
  let fs = compileShader(gl.FRAGMENT_SHADER, WARP_FRAG)
  glProg = gl.createProgram()
  gl.attachShader(glProg, vs)
  gl.attachShader(glProg, fs)
  gl.linkProgram(glProg)
  if (!vs || !fs || !gl.getProgramParameter(glProg, gl.LINK_STATUS)) {
    console.error("Warp program link failed")
    gl = null
    glInitFailed = true
    return false
  }
  glLoc = {
    pos: gl.getAttribLocation(glProg, "a_pos"),
    tex: gl.getUniformLocation(glProg, "u_tex"),
    res: gl.getUniformLocation(glProg, "u_res"),
    center: gl.getUniformLocation(glProg, "u_center"),
    k: gl.getUniformLocation(glProg, "u_k"),
    radius: gl.getUniformLocation(glProg, "u_radius"),
    aberr: gl.getUniformLocation(glProg, "u_aberr"),
    slice: gl.getUniformLocation(glProg, "u_slice"),
    seed: gl.getUniformLocation(glProg, "u_seed"),
    scan: gl.getUniformLocation(glProg, "u_scan"),
  }
  glQuad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, glQuad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  glTex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, glTex)
  // Non-power-of-two source: clamp + linear, no mipmaps
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  return true
}

// Show/hide the GL overlay. While active the crisp 2D canvas is hidden (it's
// still drawn each frame as the texture source); at rest we show it directly
// and the GL canvas does nothing.
function setWarpActive(on) {
  if (on === warpActive) return
  warpActive = on
  glcanvas.style.display = on ? "block" : "none"
  canvas.style.visibility = on ? "hidden" : "visible"
}

function renderWarp(cx, cy, k, radius, aberr, slice, seed, scan) {
  gl.viewport(0, 0, glcanvas.width, glcanvas.height)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.useProgram(glProg)

  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, glTex)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas)

  gl.uniform1i(glLoc.tex, 0)
  gl.uniform2f(glLoc.res, glcanvas.width, glcanvas.height)
  gl.uniform2f(glLoc.center, cx, cy)
  gl.uniform1f(glLoc.k, k)
  gl.uniform1f(glLoc.radius, radius)
  gl.uniform1f(glLoc.aberr, aberr)
  gl.uniform1f(glLoc.slice, slice)
  gl.uniform1f(glLoc.seed, seed)
  gl.uniform1f(glLoc.scan, scan)

  gl.bindBuffer(gl.ARRAY_BUFFER, glQuad)
  gl.enableVertexAttribArray(glLoc.pos)
  gl.vertexAttribPointer(glLoc.pos, 2, gl.FLOAT, false, 0, 0)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

// Background slideshow layers + wrapper (for blur)
const bgWrapper = document.getElementById("bg-layers")
const bgLayers = [document.getElementById("bgA"), document.getElementById("bgB")]
const bgVideo = document.getElementById("bg-video")
let activeLayer = 0

// Fullscreen canvas
canvas.width = document.body.clientWidth
canvas.height = document.body.clientHeight
let axis = 0

const ctx = canvas.getContext("2d")

// ----------------------------------------------------------------------------
// Audio resampling: Lively gives us a fixed-length array (typically 128).
// Average it down (or up) into exactly `buckets` values so the bar count is
// fully controllable instead of being an accident of the dedup hack.
// ----------------------------------------------------------------------------
function resample(arr, buckets) {
  const out = new Array(buckets)
  for (let i = 0; i < buckets; i++) {
    const start = Math.floor((i / buckets) * arr.length)
    const end = Math.max(start + 1, Math.floor(((i + 1) / buckets) * arr.length))
    let sum = 0
    let count = 0
    for (let j = start; j < end && j < arr.length; j++) {
      sum += arr[j]
      count++
    }
    out[i] = count > 0 ? sum / count : 0
  }
  return out
}

// ----------------------------------------------------------------------------
// Color mode helper. Returns a bar's hue in degrees based on the active mode.
//   0 static   : the original top/bottom gradient (halfRatio drives it)
//   1 rainbow  : full spectrum around the ring, spinning over time
//   2 volume   : the gradient, shifted bodily by current loudness
// halfRatio = position in the top->bottom gradient (0 at bottom, 1 at top)
// ratio     = angular position around the ring (0..1)
// `average` is the per-frame loudness (an implicit global set in the listener).
// ----------------------------------------------------------------------------
function barHue(halfRatio, ratio) {
  if (colorMode === 1) {
    return (ratio * 360 + rainbowOffset) % 360
  }
  let base = (endHue - startHue) * halfRatio + startHue
  if (colorMode === 2) {
    base += average * 360 * (rainbowSpeed / 100) * 4
  }
  // Wrap into 0..360, guarding against any negative intermediate
  return (((base % 360) + 360) % 360)
}

// ----------------------------------------------------------------------------
// Shared bar styling: set strokeStyle + shadowColor for a bar of the given hue.
// When barGradient is on, fade dim base -> bright tip along the bar's length.
// (x0,y0)->(x1,y1) are the bar's start/end points; the gradient is built along
// that same line so it lines up whatever orientation the bar is drawn in.
// ----------------------------------------------------------------------------
function applyBarStyle(hue, x0, y0, x1, y1) {
  if (barGradient) {
    let g = ctx.createLinearGradient(x0, y0, x1, y1)
    g.addColorStop(0, `hsl(${hue}, ${saturation}%, ${Math.max(0, lightness * 0.3)}%)`)
    g.addColorStop(1, `hsl(${hue}, ${saturation}%, ${Math.min(95, lightness + 20)}%)`)
    ctx.strokeStyle = g
    ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)` // shadow can't be a gradient
  } else {
    let color = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    ctx.strokeStyle = color
    ctx.shadowColor = color
  }
}

// Linear bar height: how tall a full-scale bar gets in the non-circular modes.
function linearMaxLen() {
  return ctx.canvas.height * 0.45 * (barPercent / 100)
}

// ----- vizMode 0: circular ring (the original look) -------------------------
// `spectrum` is the single-sided processed array; we mirror it here so the ring
// keeps its left/right symmetry exactly as before.
function drawCircle(spectrum, xPos, yPos, innerRadius, maxLength) {
  let audio = spectrum.slice().reverse().concat(spectrum)
  if (audio.length <= 2) return
  // Mirror the peak buffer the same way so cap[index] lines up with audio[index]
  let peakAudio = peakCaps ? peaks.slice().reverse().concat(peaks) : null

  ctx.lineWidth = ((barWidth / 100) * (2 * innerRadius * Math.PI)) / audio.length
  let innerOffset = average * maxLength * (innerMovement / 100)

  // Kaleidoscope: fold the bar set into `segments` wedges (1 = normal ring)
  let segments = Math.max(1, symmetry)
  let segAngle = (2 * Math.PI) / segments
  ctx.lineWidth = ctx.lineWidth / segments

  for (let s = 0; s < segments; s++) {
    let segBase = s * segAngle + globalRotation
    let mirror = s % 2 === 1 // reflect alternate wedges for a true kaleidoscope

    audio.map((val, index, arr) => {
      let ratio = (index + 0.5) / arr.length
      let halfRatio = Math.abs(((index / (arr.length / 2)) % (arr.length / 2)) - 1)
      let a = mirror ? 1 - ratio : ratio
      let inner = innerRadius + innerOffset
      let outer = val * maxLength + innerRadius + innerOffset

      ctx.beginPath()
      ctx.translate(xPos, yPos)
      ctx.rotate(segBase + a * segAngle)
      applyBarStyle(barHue(halfRatio, ratio), 0, inner, 0, outer)
      ctx.moveTo(0, inner)
      ctx.lineTo(0, outer)
      ctx.stroke()

      // Peak fly-off: spawn from the bar tip heading radially outward. Spawn in
      // EVERY kaleidoscope wedge (not just segment 0) so streaks radiate from all
      // the mirrored bars — otherwise they'd all launch from one direction.
      // sideIdx maps the mirrored ring index back to the single-sided
      // spectrum/flyTrigger index.
      if (peakFlyOff) {
        let sideIdx = index < arr.length / 2 ? Math.floor(arr.length / 2) - 1 - index : index - Math.floor(arr.length / 2)
        if (flyTrigger[sideIdx]) {
          let th = segBase + a * segAngle
          spawnFlyCap(xPos - outer * Math.sin(th), yPos + outer * Math.cos(th), -Math.sin(th), Math.cos(th), barHue(halfRatio, ratio))
        }
      }

      if (peakCaps) {
        let capBase = peakAudio[index] * maxLength + inner
        let capColor = `hsl(${barHue(halfRatio, ratio)}, ${saturation}%, ${Math.min(95, lightness + 35)}%)`
        ctx.strokeStyle = capColor
        ctx.shadowColor = capColor
        ctx.beginPath()
        ctx.moveTo(0, capBase)
        ctx.lineTo(0, capBase + 6)
        ctx.stroke()
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0)
    })
  }
}

// ----- vizMode 1 & 2: horizontal bars ---------------------------------------
// Bottom bars grow up from the baseline; mirrored bars grow both ways from it.
// Low frequencies are on the left, high on the right. Rotation / inner-circle
// reactivity / kaleidoscope don't apply here (they're circle concepts).
function drawLinearBars(spectrum, xPos, yPos, mirrorBars) {
  let count = spectrum.length
  if (count < 1) return
  let w = ctx.canvas.width
  let baseY = yPos
  let spacing = w / count
  let maxLen = linearMaxLen()
  let xOff = xPos - w / 2 // horizontal position slider shifts the whole row
  ctx.lineWidth = Math.max(1, spacing * (barWidth / 50))

  for (let i = 0; i < count; i++) {
    let ratio = (i + 0.5) / count
    let x = ratio * w + xOff
    let len = spectrum[i] * maxLen
    let hue = barHue(ratio, ratio) // gradient & rainbow sweep across the spectrum

    ctx.beginPath()
    if (mirrorBars) {
      applyBarStyle(hue, x, baseY - len, x, baseY + len)
      ctx.moveTo(x, baseY - len)
      ctx.lineTo(x, baseY + len)
    } else {
      applyBarStyle(hue, x, baseY, x, baseY - len)
      ctx.moveTo(x, baseY)
      ctx.lineTo(x, baseY - len)
    }
    ctx.stroke()

    if (peakFlyOff && flyTrigger[i]) {
      spawnFlyCap(x, baseY - len, 0, -1, hue)
      if (mirrorBars) spawnFlyCap(x, baseY + len, 0, 1, hue)
    }

    if (peakCaps) {
      let pl = peaks[i] * maxLen
      let capColor = `hsl(${hue}, ${saturation}%, ${Math.min(95, lightness + 35)}%)`
      ctx.strokeStyle = capColor
      ctx.shadowColor = capColor
      ctx.beginPath()
      ctx.moveTo(x, baseY - pl)
      ctx.lineTo(x, baseY - pl - 6)
      if (mirrorBars) {
        ctx.moveTo(x, baseY + pl)
        ctx.lineTo(x, baseY + pl + 6)
      }
      ctx.stroke()
    }
  }
}

// ----- vizMode 3 & 4: spectrum line / filled area ---------------------------
// NB: this traces the frequency SPECTRUM, not a time-domain waveform (Lively
// only gives us spectrum data) — hence "Spectrum line", not "Oscilloscope".
function drawSpectrumLine(spectrum, xPos, yPos, fill) {
  let count = spectrum.length
  if (count < 2) return
  let w = ctx.canvas.width
  let baseY = yPos
  let maxLen = linearMaxLen()
  let xOff = xPos - w / 2

  let pts = []
  for (let i = 0; i < count; i++) {
    let ratio = (i + 0.5) / count
    pts.push([ratio * w + xOff, baseY - spectrum[i] * maxLen, ratio])
  }

  if (fill) {
    // Filled area: one horizontal hue gradient across the width, filled down
    // to the baseline. Sampling a few stops keeps rainbow/volume modes working.
    let grad = ctx.createLinearGradient(xOff, 0, w + xOff, 0)
    let stops = 6
    for (let s = 0; s <= stops; s++) {
      let r = s / stops
      grad.addColorStop(r, `hsl(${barHue(r, r)}, ${saturation}%, ${lightness}%)`)
    }
    ctx.beginPath()
    ctx.moveTo(pts[0][0], baseY)
    for (let p of pts) ctx.lineTo(p[0], p[1])
    ctx.lineTo(pts[count - 1][0], baseY)
    ctx.closePath()
    ctx.shadowColor = `hsl(${barHue(0.5, 0.5)}, ${saturation}%, ${lightness}%)`
    ctx.fillStyle = grad
    ctx.fill()
  } else {
    // Spectrum line: stroke each segment in its own colour so color modes apply
    ctx.lineWidth = Math.max(1, (barWidth / 50) * 3)
    ctx.lineJoin = "round"
    for (let i = 0; i < count - 1; i++) {
      let color = `hsl(${barHue(pts[i][2], pts[i][2])}, ${saturation}%, ${lightness}%)`
      ctx.strokeStyle = color
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.moveTo(pts[i][0], pts[i][1])
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1])
      ctx.stroke()
    }
  }
}

// ----- Edge mirroring (bar modes only) --------------------------------------
// When on, the linear shapes are anchored to screen edges and grow INWARD
// instead of drawing one centered row. `edgeGeom` maps an abstract
// (along, depth) pair to real canvas coords so one routine serves every edge:
//   along = pixels along the edge (0..L);  depth = pixels inward (0..maxDepth).
// Each entry is [edge, flip]; `flip` reverses the frequency direction so an
// opposing pair mirrors each other instead of both reading left->right (or
// top->bottom). One row of every pair is flipped.
const EDGE_SETS = [
  null,
  [["top", true], ["bottom", false]],
  [["left", true], ["right", false]],
  [["top", true], ["bottom", false], ["left", false], ["right", true]],
]

// Inward reach as a fraction of the perpendicular screen size. Kept low (~half
// the single-row 0.45) so opposing rows don't overlap in the middle.
const EDGE_DEPTH = 0.22

function edgeGeom(edge) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const depthV = h * EDGE_DEPTH * (barPercent / 100) // inward depth for top/bottom rows
  const depthH = w * EDGE_DEPTH * (barPercent / 100) // inward depth for left/right rows
  switch (edge) {
    case "top":
      return { L: w, maxDepth: depthV, pt: (a, d) => [a, d] }
    case "left":
      return { L: h, maxDepth: depthH, pt: (a, d) => [d, a] }
    case "right":
      return { L: h, maxDepth: depthH, pt: (a, d) => [w - d, a] }
    default: // bottom
      return { L: w, maxDepth: depthV, pt: (a, d) => [a, h - d] }
  }
}

// Bars anchored to one edge, growing inward (viz modes 1 & 2).
function drawBarsOnEdge(spectrum, edge, flip) {
  let count = spectrum.length
  if (count < 1) return
  let g = edgeGeom(edge)
  ctx.lineWidth = Math.max(1, (g.L / count) * (barWidth / 50))
  for (let i = 0; i < count; i++) {
    let ratio = (i + 0.5) / count
    let a = (flip ? 1 - ratio : ratio) * g.L
    let len = spectrum[i] * g.maxDepth
    let [x0, y0] = g.pt(a, 0)
    let [x1, y1] = g.pt(a, len)
    applyBarStyle(barHue(ratio, ratio), x0, y0, x1, y1)
    ctx.beginPath()
    ctx.moveTo(x0, y0)
    ctx.lineTo(x1, y1)
    ctx.stroke()

    // Fly-off heads back toward the edge (depth 0), the opposite of inward growth
    if (peakFlyOff && flyTrigger[i]) {
      let [ex, ey] = g.pt(a, 0)
      spawnFlyCap(x1, y1, ex - x1, ey - y1, barHue(ratio, ratio))
    }

    if (peakCaps) {
      let pd = peaks[i] * g.maxDepth
      let [cx0, cy0] = g.pt(a, pd)
      let [cx1, cy1] = g.pt(a, pd + 6)
      let capColor = `hsl(${barHue(ratio, ratio)}, ${saturation}%, ${Math.min(95, lightness + 35)}%)`
      ctx.strokeStyle = capColor
      ctx.shadowColor = capColor
      ctx.beginPath()
      ctx.moveTo(cx0, cy0)
      ctx.lineTo(cx1, cy1)
      ctx.stroke()
    }
  }
}

// Spectrum line / filled area anchored to one edge (viz modes 3 & 4).
function drawLineOnEdge(spectrum, edge, fill, flip) {
  let count = spectrum.length
  if (count < 2) return
  let g = edgeGeom(edge)
  // Flip mirrors the row by reversing which frequency sits at each spatial
  // point (not the point order), so the fill polygon never self-crosses.
  let pts = []
  for (let i = 0; i < count; i++) {
    let ratio = (i + 0.5) / count
    let d = flip ? count - 1 - i : i
    let hueRatio = (d + 0.5) / count
    let [x, y] = g.pt(ratio * g.L, spectrum[d] * g.maxDepth)
    pts.push([x, y, hueRatio])
  }

  if (fill) {
    // Hue gradient along the edge axis, filled back to the edge (depth 0).
    let [ax, ay] = g.pt(0, 0)
    let [bx, by] = g.pt(g.L, 0)
    let grad = ctx.createLinearGradient(ax, ay, bx, by)
    let stops = 6
    for (let s = 0; s <= stops; s++) {
      let r = s / stops
      // Reverse the hue ramp on a flipped row so its colours mirror the pair.
      grad.addColorStop(r, `hsl(${barHue(flip ? 1 - r : r, r)}, ${saturation}%, ${lightness}%)`)
    }
    ctx.beginPath()
    ctx.moveTo(ax, ay)
    for (let p of pts) ctx.lineTo(p[0], p[1])
    ctx.lineTo(bx, by)
    ctx.closePath()
    ctx.shadowColor = `hsl(${barHue(0.5, 0.5)}, ${saturation}%, ${lightness}%)`
    ctx.fillStyle = grad
    ctx.fill()
  } else {
    ctx.lineWidth = Math.max(1, (barWidth / 50) * 3)
    ctx.lineJoin = "round"
    for (let i = 0; i < count - 1; i++) {
      let color = `hsl(${barHue(pts[i][2], pts[i][2])}, ${saturation}%, ${lightness}%)`
      ctx.strokeStyle = color
      ctx.shadowColor = color
      ctx.beginPath()
      ctx.moveTo(pts[i][0], pts[i][1])
      ctx.lineTo(pts[i + 1][0], pts[i + 1][1])
      ctx.stroke()
    }
  }
}

function livelyAudioListener(audioArray) {
  // Set overall level
  average = audioArray.reduce((acc, val) => acc + val) / audioArray.length
  star_speed = average * 32

  // Reactive level for the beat effects. Bass isolation shifts it toward the
  // low bands (first ~10% of the spectrum) so kicks/808s drive the reaction.
  let bassBands = Math.max(1, Math.floor(audioArray.length * 0.1))
  let bassLevel = 0
  for (let i = 0; i < bassBands; i++) bassLevel += audioArray[i]
  bassLevel /= bassBands
  let beatLevel = average + (bassLevel - average) * (bassIsolation / 100)

  // Resample to half the desired bar count. This single-sided `spectrum` is the
  // shared input every draw mode works from (the circle mirrors it internally).
  let perSide = Math.max(1, Math.round(barCount / 2))
  let spectrum = resample(audioArray, perSide)

  // Smoothing / damping: ease each value toward its target so bars stop
  // jumping. smoothing=0 -> instant, higher -> smoother & laggier.
  if (smoothedAudio.length !== spectrum.length) smoothedAudio = spectrum.slice()
  let smoothFactor = Math.min(0.95, smoothing / 100)
  for (let i = 0; i < spectrum.length; i++) {
    smoothedAudio[i] += (spectrum[i] - smoothedAudio[i]) * (1 - smoothFactor)
    spectrum[i] = smoothedAudio[i]
  }

  // Compensate for overamplified bass
  spectrum = spectrum.map((elem, idx, arr) => {
    return elem * (idx / arr.length + (100 - compensation + 50) / 100)
  })

  // Peak caps: hold each bar's max, then let the marker fall under gravity.
  if (peaks.length !== spectrum.length) peaks = spectrum.slice()
  for (let i = 0; i < spectrum.length; i++) {
    if (spectrum[i] >= peaks[i]) peaks[i] = spectrum[i]
    else peaks[i] = Math.max(spectrum[i], peaks[i] - peakGravity)
  }

  // Peak fly-off: flag any band that jumped up hard enough this frame. The draw
  // functions read flyTrigger[] and launch a streak from that bar's tip.
  if (peakFlyOff) {
    if (flyCooldown.length !== spectrum.length) flyCooldown = new Array(spectrum.length).fill(0)
    if (flyTrigger.length !== spectrum.length) flyTrigger = new Array(spectrum.length).fill(false)
    if (prevSpectrum.length !== spectrum.length) prevSpectrum = spectrum.slice()
    let rise = 0.28 - (peakFlySensitivity / 100) * 0.22 // higher sensitivity -> smaller jump triggers
    for (let i = 0; i < spectrum.length; i++) {
      flyTrigger[i] = false
      if (flyCooldown[i] > 0) flyCooldown[i]--
      if (flyCooldown[i] === 0 && spectrum[i] > 0.22 && spectrum[i] - prevSpectrum[i] > rise) {
        flyTrigger[i] = true
        flyCooldown[i] = 2 // short gap so a sustained rise can stack several caps in flight
      }
    }
    prevSpectrum = spectrum.slice()
  }

  let innerRadius = (ctx.canvas.height / 2) * (innerPercent / 100)
  let maxLength = (ctx.canvas.height / 2 - innerRadius) * (barPercent / 100)

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.lineCap = roundedBars ? "round" : "butt"
  ctx.shadowBlur = glow

  // Visualizer location (+ shake/wobble). Teleport-on-beat overrides the base
  // position with the current teleport target (set on the last beat) so the ring
  // sits at a new spot instead of following the location sliders.
  let xFrac = beatTeleport ? teleportX : xPercent / 100
  let yFrac = beatTeleport ? teleportY : yPercent / 100
  let xPos = ctx.canvas.width * xFrac
  xPos += (noise(axis) - 0.5) * ((innerRadius * movementRadius) / 100)
  let yPos = ctx.canvas.height * yFrac
  yPos += (noise(0, axis) - 0.5) * ((innerRadius * movementRadius) / 100)
  axis += average * (movementSpeed / 100)

  // --- Beat detection: a spike above the slow rolling baseline = a beat ------
  beatEnergyAvg += (beatLevel - beatEnergyAvg) * 0.1
  if (beatCooldownFrames > 0) beatCooldownFrames--
  let beatMult = 2.0 - (beatSensitivity / 100) * 1.1 // higher sensitivity -> lower bar
  let isBeat = false
  if (beatCooldownFrames === 0 && beatLevel > 0.02 && beatLevel > beatEnergyAvg * beatMult) {
    isBeat = true
    beatCooldownFrames = 6 // ~min frames between beats
  }

  let flashK = reduceFlashing ? 0.4 : 1 // accessibility: damp flashing/motion
  if (isBeat) {
    shakeImpulse = Math.max(shakeImpulse, (beatShake / 100) * flashK)
    if (shockwaveEnabled) {
      let o = shockOrigin(shockwaveOrigin, ctx.canvas.width, ctx.canvas.height, xPos, yPos)
      // Ring from the center starts at the inner radius; everything else at 0.
      let startDist = o.center && shockwaveShape === 0 ? innerRadius : 0
      shockwaves.push({ ox: o.ox, oy: o.oy, dx: o.dx, dy: o.dy, center: !!o.center, dist: startDist, a0: 0.6 * flashK, age: 0 })
    }
    // Teleport on beat: pick a new spot, kept inside a margin so the ring stays
    // fully on-screen. Applied from the next frame on (see xFrac/yFrac above).
    if (beatTeleport) {
      teleportX = 0.12 + Math.random() * 0.76
      teleportY = 0.14 + Math.random() * 0.72
    }
    // Kick off a contract/release pulse from the visualizer center
    if (warpEnabled && gl) {
      warpRipples.push({ f: 0, strength: flashK })
      if (warpRipples.length > 4) warpRipples.shift()
    }
  }

  // Beat shake: a quick positional kick that decays every frame
  shakeImpulse *= 0.85
  if (shakeImpulse > 0.001) {
    let amt = shakeImpulse * 120
    xPos += (Math.random() - 0.5) * amt
    yPos += (Math.random() - 0.5) * amt
  }

  // Beat flash: pop the overlay to full strength on a beat, then decay. Reduce
  // flashing disables it outright — it's a strobe by definition, not just motion.
  if (beatFlashEnabled && !reduceFlashing) {
    if (isBeat) flashLevel = Math.max(flashLevel, beatFlashStrength / 100)
    flashLevel *= 0.82
    if (flashLevel < 0.01) flashLevel = 0
    beatFlash.style.backgroundColor = beatFlashColor
    beatFlash.style.opacity = flashLevel
  } else if (flashLevel !== 0) {
    flashLevel = 0
    beatFlash.style.opacity = 0
  }

  // Background beat reactions (OBLIVIION): four independent, stackable effects
  // composed into one wrapper transform + filter. `amt` is the shared strength.
  // Blur + Zoom fire on beats; Shake + Tilt follow the volume continuously.
  let amt = bgBeatStrength / 100
  let bgScale = 1, bgTX = 0, bgTY = 0, bgRot = 0, bgExtraBlur = 0

  // Zoom (beat-driven): a swell that eases back (replaces the old Beat zoom).
  if (bgBeatZoom) {
    if (isBeat) bgZoom = Math.max(bgZoom, 1 + amt * 0.15 * flashK)
    bgZoom += (1 - bgZoom) * 0.15
    bgScale *= bgZoom
  } else {
    bgZoom = 1
  }

  // Loudness above the threshold, normalized 0..1 — drives shake + tilt so they
  // track the volume rather than firing on discrete beats.
  let thr = (bgReactThreshold / 100) * 0.35
  let volN = Math.max(0, Math.min(1, (average - thr) / 0.15)) * flashK

  // Shake (volume-driven): a subtle continuous jitter, magnitude tracks volume.
  // Deliberately gentle — meant to twitch on a beat drop, not rattle constantly;
  // for a hard hit use the beat-driven Screen shake instead. Raise the threshold
  // to hold it off during quieter passages.
  if (bgBeatShake) {
    let s = amt * volN
    bgTX += (Math.random() - 0.5) * s * 9
    bgTY += (Math.random() - 0.5) * s * 9
  }

  // Tilt (volume-driven): leans a fixed way, proportional to volume, and holds
  // there while it's loud — eased so it settles back smoothly as things quiet.
  // Big enough to actually read as a tilt (a few degrees at typical loudness).
  let tiltTarget = bgBeatTilt ? amt * volN * 14 : 0 // degrees
  bgTiltCurrent += (tiltTarget - bgTiltCurrent) * 0.12
  bgRot += bgTiltCurrent
  bgScale *= 1 - Math.abs(bgTiltCurrent) * 0.006 // tiny zoom-out tracks the lean

  // Blur pulse (beat-driven): a burst of extra blur, stacked on the slider blur.
  if (bgBeatBlur) {
    if (isBeat) bgBlurLevel = Math.max(bgBlurLevel, flashK)
    bgBlurLevel *= 0.85
    if (bgBlurLevel < 0.01) bgBlurLevel = 0
    bgExtraBlur = amt * bgBlurLevel * 14
  } else {
    bgBlurLevel = 0
  }

  // Overscale purely in proportion to the CURRENT motion so an idle background
  // isn't zoomed at all: 1 at rest, growing only as the tilt leans (eased, no
  // snap) or the shake displaces, just enough to keep the moved edges covered.
  let shakePx = Math.max(Math.abs(bgTX), Math.abs(bgTY))
  let edgePad = 1 + Math.abs(bgTiltCurrent) * 0.02 + shakePx / Math.max(ctx.canvas.width, ctx.canvas.height)
  let bgAnyReaction = bgBeatShake || bgBeatTilt || bgBeatBlur || bgBeatZoom
  if (bgAnyReaction || Math.abs(bgTiltCurrent) > 0.01 || bgZoom !== 1) {
    bgWrapper.style.transform =
      `translate(${bgTX.toFixed(1)}px, ${bgTY.toFixed(1)}px) rotate(${bgRot.toFixed(2)}deg) scale(${(bgScale * edgePad).toFixed(4)})`
  } else {
    bgWrapper.style.transform = ""
  }
  bgWrapper.style.filter = `blur(${(bgBlurBase + bgExtraBlur).toFixed(1)}px)`

  // Starfield beat reactions (OBLIVIION): accelerate the stars forward on each
  // beat. Positional vibration is optional (off = a clean acceleration surge).
  if (starBeatEnabled) {
    if (isBeat) starBeatLevel = Math.max(starBeatLevel, flashK)
    starBeatLevel *= 0.85
    if (starBeatLevel < 0.01) starBeatLevel = 0
    let sAmt = (starBeatStrength / 100) * starBeatLevel
    star_speed *= 1 + sAmt * 4
    if (starBeatVibrate) {
      starBeatOffX = (Math.random() - 0.5) * sAmt * 120
      starBeatOffY = (Math.random() - 0.5) * sAmt * 120
    } else {
      starBeatOffX = 0
      starBeatOffY = 0
    }
  } else {
    starBeatLevel = 0
    starBeatOffX = 0
    starBeatOffY = 0
  }

  // Logo center image location — positioned independently of the visualizer
  // (its own X/Y sliders), so it no longer follows the ring or the shake.
  if (middle.style.display != "none") {
    middle.style.left = `${ctx.canvas.width * (logoXPercent / 100)}px`
    middle.style.top = `${ctx.canvas.height * (logoYPercent / 100)}px`
  }

  // Constant rotation: accumulate a base angle applied to every bar (circle)
  globalRotation += (rotationSpeed / 100) * 0.05

  // Rainbow cycle: advance the hue offset over time (only meaningful in mode 1)
  if (colorMode === 1) rainbowOffset = (rainbowOffset + rainbowSpeed * 0.15) % 360

  // Beat pulse: smoothly scale the whole visualizer up on loud moments
  let pulseTarget = 1 + average * (beatPulse / 100) * 3
  pulseScale += (pulseTarget - pulseScale) * 0.2

  // Auto-hide on silence: fade the visualizer out when it's quiet
  if (autoHideThreshold > 0) {
    let level = autoHideThreshold / 500 // map slider (0-100) to ~0-0.2 loudness
    visualizer.style.transition = "opacity 0.5s ease"
    visualizer.style.opacity = average < level ? "0" : "1"
  } else {
    visualizer.style.opacity = "1"
  }

  // Visualizer drop shadow + beat-pulse scale
  visualizer.style.transformOrigin = "center center"
  visualizer.style.transform = `scale(${pulseScale})`
  visualizer.style.filter = `drop-shadow(${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,${
    shadowOpacity / 100
  }))`

  // Dispatch to the active visualizer mode. In the linear (bar/line/area) modes
  // Edge mirror can anchor inward-growing copies to multiple screen edges;
  // when it's off we keep the original single centered row at xPos/yPos.
  if (vizMode === 0) {
    drawCircle(spectrum, xPos, yPos, innerRadius, maxLength)
  } else if (edgeMirror > 0) {
    for (let [edge, flip] of EDGE_SETS[edgeMirror]) {
      if (vizMode === 3) drawLineOnEdge(spectrum, edge, false, flip)
      else if (vizMode === 4) drawLineOnEdge(spectrum, edge, true, flip)
      else drawBarsOnEdge(spectrum, edge, flip) // modes 1 & 2: bars grow inward
    }
  } else {
    switch (vizMode) {
      case 1:
        drawLinearBars(spectrum, xPos, yPos, false)
        break
      case 2:
        drawLinearBars(spectrum, xPos, yPos, true)
        break
      case 3:
        drawSpectrumLine(spectrum, xPos, yPos, false)
        break
      case 4:
        drawSpectrumLine(spectrum, xPos, yPos, true)
        break
    }
  }

  // Peak fly-off streaks: advance each launched cap, draw a short fading trail
  // behind it, and retire it once it fades or leaves the screen. Runs regardless
  // of the current toggle so in-flight streaks finish cleanly after it's turned off.
  if (flyingCaps.length) {
    ctx.lineCap = "round"
    ctx.shadowBlur = glow
    for (let i = flyingCaps.length - 1; i >= 0; i--) {
      let c = flyingCaps[i]
      c.x += c.vx
      c.y += c.vy
      c.age++
      let lifeK = 1 - c.age / c.life
      if (lifeK <= 0 || c.x < -60 || c.x > ctx.canvas.width + 60 || c.y < -60 || c.y > ctx.canvas.height + 60) {
        flyingCaps.splice(i, 1)
        continue
      }
      let color = `hsla(${c.hue}, ${saturation}%, ${Math.min(95, lightness + 30)}%, ${lifeK})`
      ctx.strokeStyle = color
      ctx.shadowColor = `hsl(${c.hue}, ${saturation}%, ${Math.min(95, lightness + 30)}%)`
      ctx.lineWidth = 3 * lifeK + 1
      ctx.beginPath()
      ctx.moveTo(c.x, c.y)
      ctx.lineTo(c.x - c.vx * 2.5, c.y - c.vy * 2.5) // trail opposite travel
      ctx.stroke()
    }
  }

  // Shockwaves: rings or sweeping lines expanding from the chosen origin on beats
  if (shockwaves.length) {
    ctx.lineCap = "butt"
    ctx.shadowBlur = glow
    let speed = 4 + (shockwaveSpeed / 100) * 24 // px/frame
    let durFrames = 15 + (shockwaveDuration / 100) * 105 // lifetime
    let reach = Math.hypot(ctx.canvas.width, ctx.canvas.height)
    let span = reach // long enough to cross the screen for the Line shape
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      let s = shockwaves[i]
      s.dist += speed
      s.age++
      let alpha = s.a0 * (1 - s.age / durFrames)
      if (alpha <= 0 || s.dist > reach + innerRadius) {
        shockwaves.splice(i, 1)
        continue
      }
      let hue = barHue(0.5, 0.5)
      ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`
      ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.lineWidth = shockwaveThickness
      ctx.beginPath()
      if (shockwaveShape === 1) {
        // Line: a straight bar perpendicular to the travel direction, sliding out
        let px = -s.dy * span // perpendicular to (dx,dy)
        let py = s.dx * span
        let cxp = s.ox + s.dx * s.dist
        let cyp = s.oy + s.dy * s.dist
        ctx.moveTo(cxp - px, cyp - py)
        ctx.lineTo(cxp + px, cyp + py)
        if (s.center) {
          // Center origin sweeps both directions
          let cxm = s.ox - s.dx * s.dist
          let cym = s.oy - s.dy * s.dist
          ctx.moveTo(cxm - px, cym - py)
          ctx.lineTo(cxm + px, cym + py)
        }
      } else {
        // Ring: expanding circle centered on the origin
        ctx.arc(s.ox, s.oy, s.dist, 0, Math.PI * 2)
      }
      ctx.stroke()
    }
  }

  // --- Warp + glitch (GPU) ---------------------------------------------------
  // Warp (beat-driven contract/release pinch) and the glitch rack (chromatic
  // aberration, slice glitch, scanlines) all run through one GL overlay: the
  // crisp 2D canvas is uploaded as a texture and the fragment shader applies
  // whatever's active. While any effect is live we show the overlay (hiding the
  // 2D canvas); when everything's idle we drop back to the plain canvas so this
  // costs nothing.
  if (gl) {
    let radius = Math.hypot(ctx.canvas.width, ctx.canvas.height) * 0.5 // pinch reach

    // Warp pinch: sum the active contract/release pulses into one factor.
    let k = 0 // >0 suck toward center, <0 bulge back out
    if (warpEnabled) {
      let period = 3.5 + (warpDetail / 100) * 10 // pulse length in frames (~0.06–0.22s)
      let contractAmp = (warpAmount / 100) * 0.9 // max suck-in strength near the center
      let expandAmp = 0.17 // max bulge-out ≈ 20% bigger than original
      for (let i = warpRipples.length - 1; i >= 0; i--) {
        let p = warpRipples[i]
        let t = p.f / period // normalized age (1 = one full pulse)
        let s = Math.sin(2 * Math.PI * t)
        k += p.strength * (s >= 0 ? contractAmp * s : expandAmp * s)
        p.f++
        if (t >= 1) warpRipples.splice(i, 1)
      }
    } else if (warpRipples.length) {
      warpRipples.length = 0
    }

    // Chromatic aberration: split scales with loudness, spikes on beats.
    if (rgbSplitEnabled) {
      let target = (rgbSplitAmount / 100) * 42 * flashK * Math.min(1, average * 5)
      if (isBeat) target = Math.max(target, (rgbSplitAmount / 100) * 42 * flashK)
      aberrLevel += (target - aberrLevel) * 0.4
    } else {
      aberrLevel = 0
    }

    // Slice glitch: a burst on each beat that decays over a few frames.
    if (sliceGlitchEnabled && isBeat) {
      sliceLevel = (sliceGlitchAmount / 100) * 240 * flashK
      glitchSeed = Math.random() * 1000
    }
    sliceLevel *= 0.8
    if (!sliceGlitchEnabled) sliceLevel = 0

    let scanInt = scanlinesEnabled ? scanlineAmount / 100 : 0

    let warpOn = Math.abs(k) > 0.001
    let glitchOn = aberrLevel > 0.1 || sliceLevel > 0.1 || scanInt > 0.001
    if (warpOn || glitchOn) {
      setWarpActive(true)
      renderWarp(xPos, yPos, warpOn ? Math.min(3, k) : 0, radius, aberrLevel, sliceLevel, glitchSeed, scanInt)
    } else {
      setWarpActive(false)
    }
  }
}

// ----------------------------------------------------------------------------
// Background handling + slideshow
// ----------------------------------------------------------------------------
let staticBg = "" // last value chosen in the "Background image" dropdown
let slideshowEnabled = false
let slideshowInterval = 30 // seconds
let slideshowShuffle = true
let slideshowFade = 2 // seconds
let slideshowTimer = null
let playlist = [] // array of relative paths like "images/foo.jpg"
let playIndex = 0

// Batch 6: background extras
let bgZoom = 1 // current (decaying) background scale (driven by the Zoom reaction)
let videoBgEnabled = false
let videoBgFile = "" // relative path from the "videos" folderDropdown
let bgBlurBase = 0 // background blur from the slider; beat blur-pulse adds on top

// Batch 7 part 2: beat reactions borrowed from OBLIVIION's fork (credited in the
// UI). The background can react in four independent, stackable ways; the stars
// accelerate on the beat (with optional vibration). One strength slider each.
// Shake + Tilt are VOLUME-driven (continuous, gated by bgReactThreshold), so a
// tilt holds while it's loud and relaxes as it quiets; Blur + Zoom are beat-driven.
let bgBeatShake = false // volume-driven jitter
let bgBeatTilt = false // volume-driven lean + tiny zoom-out (holds while loud)
let bgBeatBlur = false // beat-driven blur pulse
let bgBeatZoom = false // beat-driven swell (was the old standalone "Beat zoom")
let bgBeatStrength = 50
let bgReactThreshold = 80 // loudness gate for the volume-driven shake/tilt
let bgTiltCurrent = 0 // eased tilt angle (deg) for smoothness
let bgBlurLevel = 0 // decaying impulse for the beat-driven blur pulse
let starBeatEnabled = false
let starBeatStrength = 50
let starBeatVibrate = false // also jolt the field's position (off = accelerate only)
let starBeatLevel = 0 // decaying beat impulse for the stars
let starBeatOffX = 0 // positional jolt applied to the starfield (read by stars.js)
let starBeatOffY = 0

// Show/hide the looping video background. When it's on, the image layers are
// hidden behind it; when off, they come back (slideshow/static resumes).
function applyVideoBg() {
  if (videoBgEnabled && videoBgFile) {
    const src = `/${String(videoBgFile).replace(/\\/g, "/")}`
    if (bgVideo.getAttribute("src") !== src) {
      bgVideo.setAttribute("src", src)
      bgVideo.load()
    }
    bgVideo.style.display = "block"
    const p = bgVideo.play()
    if (p && p.catch) p.catch(() => {})
    bgLayers[0].style.visibility = "hidden"
    bgLayers[1].style.visibility = "hidden"
  } else {
    bgVideo.pause()
    bgVideo.style.display = "none"
    bgLayers[0].style.visibility = ""
    bgLayers[1].style.visibility = ""
  }
}

function applyBgBlur(px) {
  bgWrapper.style.filter = `blur(${Math.round(px)}px)`
}

// Crossfade the background to `url` (a relative path, no leading slash).
function setBackground(url, fadeSeconds) {
  if (!url) return
  const fade = typeof fadeSeconds === "number" ? fadeSeconds : 0
  const cur = bgLayers[activeLayer]
  const next = bgLayers[1 - activeLayer]
  const src = `/${String(url).replace(/\\/g, "/")}`

  // Preload so we never flash an empty/half-loaded image
  const img = new Image()
  img.onload = () => {
    next.style.transition = `opacity ${fade}s ease-in-out`
    cur.style.transition = `opacity ${fade}s ease-in-out`
    next.style.backgroundImage = `url("${src}")`
    next.style.opacity = 1
    cur.style.opacity = 0
    activeLayer = 1 - activeLayer
  }
  img.onerror = () => {
    // Skip a missing file rather than freezing on it
    if (slideshowEnabled) advanceSlideshow()
  }
  img.src = src
}

function buildPlaylist() {
  let files = Array.isArray(window.SLIDESHOW_FILES) ? window.SLIDESHOW_FILES.slice() : []
  if (slideshowShuffle) {
    for (let i = files.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[files[i], files[j]] = [files[j], files[i]]
    }
  }
  playlist = files
  playIndex = 0
}

function advanceSlideshow() {
  if (!playlist.length) return
  playIndex++
  if (playIndex >= playlist.length) {
    // Reshuffle on each loop so a shuffled playlist doesn't repeat the same order
    if (slideshowShuffle) buildPlaylist()
    playIndex = 0
  }
  setBackground(playlist[playIndex], slideshowFade)
}

function startSlideshow() {
  stopSlideshow()
  buildPlaylist()
  if (!playlist.length) {
    // Nothing to cycle: fall back to the static dropdown image
    if (staticBg) setBackground(staticBg, 0)
    return
  }
  setBackground(playlist[playIndex], 0) // first image instantly
  slideshowTimer = setInterval(advanceSlideshow, Math.max(1, slideshowInterval) * 1000)
}

function stopSlideshow() {
  if (slideshowTimer) {
    clearInterval(slideshowTimer)
    slideshowTimer = null
  }
}

function refreshSlideshowState() {
  if (slideshowEnabled) {
    startSlideshow()
  } else {
    stopSlideshow()
    if (staticBg) setBackground(staticBg, 0)
  }
}

// ----------------------------------------------------------------------------
// Batch 8: genre / listener-type presets. Each preset is applied by replaying a
// bundle of property values through livelyPropertyListener — that reuses every
// existing side-effect (GL bring-up for warp/glitch, the dim overlay, starfield
// filter, etc.) with no duplication. Lively's property channel is one-way, so
// this can't move the panel sliders; it sets the look directly and the user can
// still fine-tune any single control afterward.
//
// Each preset is `{ ...PRESET_BASE, ...overrides }` so it sets *most* of the
// look at once and switching presets fully re-themes (no leftovers from a prior
// vibe or from the user's slider tweaks). PRESET_BASE is a neutral, effects-off
// baseline. Deliberately NOT touched by presets: reduceFlashing (accessibility),
// visualizer position, shadow, and content (background image/slideshow/video,
// center image) — those stay whatever the user set.
const PRESET_BASE = {
  vizMode: 0, symmetry: 0, edgeMirror: 0,
  colorMode: 0, rainbowSpeed: 30, startHue: 206, endHue: 170, saturation: 50, lightness: 50, barGradient: false,
  barCount: 128, maxLength: 100, barWidth: 30, barGlow: 10, roundedBars: true, innerRadius: 50, innerMovement: 25, barCompensation: 25,
  smoothing: 40, rotationSpeed: 0, beatPulse: 0, autoHideThreshold: 0,
  beatSensitivity: 50, bassIsolation: 0, beatShake: 0, beatTeleport: false,
  shockwave: false, shockwaveShape: 0, shockwaveOrigin: 0, shockwaveThickness: 3, shockwaveDuration: 40, shockwaveSpeed: 40,
  beatFlashEnabled: false, beatFlashColor: "#FFFFFF", beatFlashStrength: 60,
  warpEnabled: false, warpAmount: 40, warpDetail: 40,
  rgbSplitEnabled: false, rgbSplitAmount: 50, sliceGlitchEnabled: false, sliceGlitchAmount: 50, scanlinesEnabled: false, scanlineAmount: 40,
  peakCaps: false, peakGravity: 10, peakFlyOff: false, peakFlySensitivity: 50, peakFlySpeed: 50,
  bgDim: 0, bgBlur: 0,
  showStars: true, starColor: "#FFFFFF", starOpacity: 35, starGlow: 15, starBlur: 10,
  bgBeatShake: false, bgBeatTilt: false, bgBeatBlur: false, bgBeatZoom: false, bgBeatStrength: 50, bgReactThreshold: 80,
  starBeatEnabled: false, starBeatStrength: 50, starBeatVibrate: false,
  shakeSpeed: 50, shakeRadius: 15,
}

// Index 0 is "Custom" (no-op); 1..N line up with the dropdown items below.
const PRESETS = [
  null, // 0 = Custom (use sliders): apply nothing
  { // 1 = Chill / Lo-fi — Lofi Girl / Chillhop: calm filled area, warm & muted, soft
    ...PRESET_BASE, vizMode: 4, startHue: 30, endHue: 330, saturation: 38, lightness: 60,
    yPercent: 100, // sit the filled area on the very bottom of the screen
    barGradient: true, barGlow: 7, innerRadius: 48, barCompensation: 35, smoothing: 74, rotationSpeed: 3,
    beatPulse: 6, shakeRadius: 8, bgDim: 35, bgBlur: 4,
    starColor: "#FFE0B0", starOpacity: 22, starGlow: 9, starBlur: 9,
    bgBeatTilt: true, bgBeatStrength: 28, bgReactThreshold: 85,
  },
  { // 2 = Chillstep — Seeking Blue / MrSuicideSheep: melodic circle, cool teal/aqua, peak caps
    // (teal→cyan, kept clear of Synthwave's magenta→cyan sweep so the two don't read alike)
    ...PRESET_BASE, vizMode: 0, startHue: 165, endHue: 200, saturation: 66, lightness: 58,
    barGradient: true, barWidth: 35, barGlow: 16, innerRadius: 46, innerMovement: 35, smoothing: 55, rotationSpeed: 6,
    beatPulse: 18, peakCaps: true, peakGravity: 8,
    shockwave: true, shockwaveShape: 0, shockwaveThickness: 2, shockwaveSpeed: 35,
    bgDim: 30, starColor: "#7FEAD8", starOpacity: 35, starGlow: 16,
    starBeatEnabled: true, starBeatStrength: 35, bgBeatTilt: true, bgBeatStrength: 25,
  },
  { // 3 = House / DJ — steady club groove: mirrored bars, rainbow cycle, bg zoom on beat
    ...PRESET_BASE, vizMode: 2, colorMode: 1, rainbowSpeed: 40, saturation: 80, lightness: 55,
    barWidth: 45, barGlow: 14, smoothing: 35, beatPulse: 30, beatSensitivity: 60, beatShake: 25,
    shockwave: true, shockwaveShape: 1, shockwaveOrigin: 2, shockwaveSpeed: 45,
    bgBeatZoom: true, bgBeatStrength: 45, bgDim: 25, showStars: false,
  },
  { // 4 = EDM / Festival — Monstercat energy: kaleidoscope ring, rainbow, glow, flash
    ...PRESET_BASE, vizMode: 0, symmetry: 3, colorMode: 1, rainbowSpeed: 55, saturation: 90, lightness: 55,
    barWidth: 38, barGlow: 20, innerRadius: 44, innerMovement: 40, beatPulse: 35, beatSensitivity: 60,
    shockwave: true, shockwaveShape: 0, shockwaveSpeed: 55, rotationSpeed: 10,
    beatFlashEnabled: true, beatFlashColor: "#39FFEE", beatFlashStrength: 30,
    starBeatEnabled: true, starBeatStrength: 45, bgBeatZoom: true, bgBeatStrength: 40,
    bgDim: 35, starOpacity: 45,
  },
  { // 5 = Dubstep — Trap Nation / UKF: hot red, bass-driven shake + warp + RGB split + flash
    ...PRESET_BASE, vizMode: 0, startHue: 22, endHue: 0, saturation: 100, lightness: 52,
    barWidth: 60, barGlow: 18, roundedBars: false, innerRadius: 42, innerMovement: 45, smoothing: 28,
    beatPulse: 42, beatSensitivity: 72, bassIsolation: 82, beatShake: 75,
    shockwave: true, shockwaveShape: 0, shockwaveThickness: 5, shockwaveSpeed: 65,
    warpEnabled: true, warpAmount: 62, warpDetail: 45, rgbSplitEnabled: true, rgbSplitAmount: 58,
    beatFlashEnabled: true, beatFlashColor: "#FF3010", beatFlashStrength: 42,
    peakFlyOff: true, peakFlySensitivity: 60, peakFlySpeed: 60,
    bgBeatShake: true, bgBeatStrength: 55, bgReactThreshold: 75, bgDim: 30, showStars: false,
  },
  { // 6 = Trap — cleaner bass: purple→teal ring, peak caps, shockwave rings, bg zoom
    ...PRESET_BASE, vizMode: 0, startHue: 280, endHue: 180, saturation: 85, lightness: 55,
    barWidth: 48, barGlow: 16, innerRadius: 45, innerMovement: 38, smoothing: 38,
    beatPulse: 34, beatSensitivity: 66, bassIsolation: 60, beatShake: 35,
    shockwave: true, shockwaveShape: 0, shockwaveSpeed: 48, peakCaps: true, peakGravity: 14,
    beatFlashEnabled: true, beatFlashColor: "#B060FF", beatFlashStrength: 28,
    starBeatEnabled: true, starBeatStrength: 40, bgBeatZoom: true, bgBeatStrength: 40,
    bgDim: 35, starColor: "#C79BFF", starOpacity: 38,
  },
  { // 7 = Hardstyle — aggressive: red mirrored bars, scanlines + slice glitch, screen shake
    ...PRESET_BASE, vizMode: 2, startHue: 0, endHue: 0, saturation: 95, lightness: 60,
    barWidth: 40, barGlow: 14, roundedBars: false, smoothing: 22, beatPulse: 30,
    beatSensitivity: 78, bassIsolation: 55, beatShake: 60,
    shockwave: true, shockwaveShape: 1, shockwaveSpeed: 60,
    scanlinesEnabled: true, scanlineAmount: 35, sliceGlitchEnabled: true, sliceGlitchAmount: 60,
    beatFlashEnabled: true, beatFlashColor: "#FF2040", beatFlashStrength: 40,
    bgBeatShake: true, bgBeatStrength: 60, bgReactThreshold: 70, bgDim: 20, showStars: false,
  },
  { // 8 = Synthwave — neon magenta→cyan ring, glow, slow spin, CRT scanlines
    ...PRESET_BASE, vizMode: 0, startHue: 300, endHue: 190, saturation: 92, lightness: 56,
    barGradient: true, barWidth: 40, barGlow: 22, innerRadius: 45, innerMovement: 30, smoothing: 45,
    rotationSpeed: 12, beatPulse: 22, shockwave: true, shockwaveShape: 0, shockwaveSpeed: 40,
    scanlinesEnabled: true, scanlineAmount: 28,
    starColor: "#B36BFF", starOpacity: 40, starGlow: 18, bgDim: 45, bgBeatTilt: true, bgBeatStrength: 25,
  },
  { // 9 = Minimal — thin near-white bottom bars, low glow, nothing flashy
    ...PRESET_BASE, vizMode: 1, saturation: 0, lightness: 90, barWidth: 12, barGlow: 2,
    yPercent: 100, // sit the bottom bars on the very bottom of the screen
    innerRadius: 50, smoothing: 50, shakeRadius: 0, showStars: false, bgDim: 0,
  },
  { // 10 = Author's choice (heavy) — owner's own maxed-out look: 8-way kaleidoscope,
    // fat volume-reactive bars, warp + RGB split + slice glitch + beat flash, the works.
    // Captured from the owner's live sliders. Heavy on purpose.
    ...PRESET_BASE, vizMode: 0, symmetry: 5, colorMode: 2, endHue: 100,
    barCount: 120, barWidth: 150, barGlow: 25, roundedBars: false, innerRadius: 30,
    peakFlyOff: true, peakFlySensitivity: 60, peakFlySpeed: 100,
    rotationSpeed: 50, beatPulse: 40, shakeSpeed: 100, shakeRadius: 50,
    beatSensitivity: 60, bassIsolation: 70, beatShake: 100, beatTeleport: true,
    beatFlashEnabled: true, beatFlashColor: "#CC2711",
    shockwave: true, shockwaveOrigin: 9, shockwaveThickness: 20, shockwaveDuration: 0, shockwaveSpeed: 100,
    warpEnabled: true, warpAmount: 60, warpDetail: 20,
    rgbSplitEnabled: true, rgbSplitAmount: 100, sliceGlitchEnabled: true,
    bgDim: 20, bgBlur: 2,
    bgBeatShake: true, bgBeatTilt: true, bgBeatBlur: true, bgBeatZoom: true,
    starBeatEnabled: true, starBeatStrength: 70,
  },
  { // 11 = Author's choice (chill) — owner's own laid-back look: edge-mirrored
    // bottom bars, rainbow cycle, peak caps, gentle background tilt. Captured
    // from the owner's live sliders.
    ...PRESET_BASE, vizMode: 1, edgeMirror: 1, colorMode: 1,
    barCount: 190, barWidth: 45, barGlow: 25, innerRadius: 30,
    peakCaps: true, peakGravity: 24,
    bgDim: 10, bgBlur: 3, bgBeatTilt: true, bgBeatStrength: 30,
  },
]

function applyPreset(idx) {
  const bundle = PRESETS[idx]
  if (!bundle) return // 0 / Custom / out of range: leave the sliders in charge
  for (const key in bundle) livelyPropertyListener(key, bundle[key])
}

function livelyPropertyListener(name, val) {
  // debug.textContent += `Name: ${name} Val: ${val}`
  switch (name) {
    case "preset":
      // Defer so it applies AFTER the rest of the startup property burst (whose
      // order isn't guaranteed), otherwise saved slider values could clobber a
      // saved preset on reload. Instant enough when picked at runtime.
      setTimeout(() => applyPreset(Math.round(Number(val)) || 0), 60)
      break
    case "innerRadius":
      innerPercent = val
      // Logo image width & height
      let rad = (ctx.canvas.height / 2) * (val / 100)
      middle.style.width = `${rad * 2}px`
      middle.style.height = `${rad * 2}px`
      break
    case "middleImageScale":
      middle.style.transform = `translate(-50%, -50%) scale(${val / 100})`
      break
    case "maxLength":
      barPercent = val
      break
    case "barCount":
      barCount = Math.max(2, Math.round(val))
      break
    case "rotationSpeed":
      rotationSpeed = val
      break
    case "smoothing":
      smoothing = val
      break
    case "beatPulse":
      beatPulse = val
      break
    case "autoHideThreshold":
      autoHideThreshold = val
      break
    case "bgDim":
      bgDim = val
      const dim = document.getElementById("dim-overlay")
      if (dim) dim.style.opacity = val / 100
      break
    case "bgImage":
      staticBg = val.replace(/\\/g, "/")
      // Show it when the slideshow is off, OR when it's on but has nothing to play
      if (!slideshowEnabled || playlist.length === 0) setBackground(staticBg, 0)
      break
    case "bgBlur":
      bgBlurBase = val
      applyBgBlur(val)
      break
    case "bgBeatShake":
      bgBeatShake = val
      break
    case "bgBeatTilt":
      bgBeatTilt = val
      break
    case "bgBeatBlur":
      bgBeatBlur = val
      break
    case "bgBeatZoom":
      bgBeatZoom = val
      break
    case "bgBeatStrength":
      bgBeatStrength = val
      break
    case "bgReactThreshold":
      bgReactThreshold = val
      break
    case "starBeatEnabled":
      starBeatEnabled = val
      break
    case "starBeatStrength":
      starBeatStrength = val
      break
    case "starBeatVibrate":
      starBeatVibrate = val
      break
    case "videoBgEnabled":
      videoBgEnabled = val
      applyVideoBg()
      break
    case "videoBg":
      videoBgFile = val
      if (videoBgEnabled) applyVideoBg()
      break
    case "slideshowEnabled":
      slideshowEnabled = val
      refreshSlideshowState()
      break
    case "slideshowInterval":
      slideshowInterval = val
      if (slideshowEnabled) startSlideshow()
      break
    case "slideshowShuffle":
      slideshowShuffle = val
      if (slideshowEnabled) startSlideshow()
      break
    case "slideshowFade":
      slideshowFade = val
      break
    case "useMiddleImage":
      middle.style.display = val ? "block" : "none"
      break
    case "middleImage":
      middle.src = `/${val.replace(/\\/g, "/")}`
      break
    case "barWidth":
      barWidth = val
      break
    case "startHue":
      startHue = val
      break
    case "endHue":
      endHue = val
      break
    case "saturation":
      saturation = val
      break
    case "lightness":
      lightness = val
      break
    case "colorMode":
      colorMode = Math.round(Number(val)) || 0
      break
    case "rainbowSpeed":
      rainbowSpeed = val
      break
    case "barGradient":
      barGradient = val
      break
    case "symmetry": {
      // dropdown returns an index; map it to an actual segment count
      const seg = [1, 2, 3, 4, 6, 8]
      symmetry = seg[Math.round(Number(val))] || 1
      break
    }
    case "vizMode":
      vizMode = Math.round(Number(val)) || 0
      break
    case "edgeMirror":
      edgeMirror = Math.round(Number(val)) || 0
      break
    case "beatSensitivity":
      beatSensitivity = val
      break
    case "bassIsolation":
      bassIsolation = val
      break
    case "beatShake":
      beatShake = val
      break
    case "shockwave":
      shockwaveEnabled = val
      break
    case "shockwaveOrigin":
      shockwaveOrigin = Math.round(Number(val))
      break
    case "shockwaveShape":
      shockwaveShape = Math.round(Number(val))
      break
    case "shockwaveThickness":
      shockwaveThickness = val
      break
    case "shockwaveDuration":
      shockwaveDuration = val
      break
    case "shockwaveSpeed":
      shockwaveSpeed = val
      break
    case "reduceFlashing":
      reduceFlashing = val
      break
    case "beatFlashEnabled":
      beatFlashEnabled = val
      break
    case "beatFlashColor":
      beatFlashColor = val
      break
    case "beatFlashStrength":
      beatFlashStrength = val
      break
    case "beatTeleport":
      beatTeleport = val
      break
    case "peakCaps":
      peakCaps = val
      break
    case "peakGravity":
      peakGravity = val / 1000
      break
    case "peakFlyOff":
      peakFlyOff = val
      break
    case "peakFlySensitivity":
      peakFlySensitivity = val
      break
    case "peakFlySpeed":
      peakFlySpeed = val
      break
    case "warpEnabled":
      warpEnabled = val
      if (warpEnabled) {
        initWarpGL() // brings up WebGL once; ripples fire on the next beat
      } else {
        warpRipples.length = 0
        setWarpActive(false)
      }
      break
    case "warpAmount":
      warpAmount = val
      break
    case "warpDetail":
      warpDetail = val
      break
    case "rgbSplitEnabled":
      rgbSplitEnabled = val
      if (rgbSplitEnabled) initWarpGL()
      else aberrLevel = 0
      break
    case "rgbSplitAmount":
      rgbSplitAmount = val
      break
    case "sliceGlitchEnabled":
      sliceGlitchEnabled = val
      if (sliceGlitchEnabled) initWarpGL()
      else sliceLevel = 0
      break
    case "sliceGlitchAmount":
      sliceGlitchAmount = val
      break
    case "scanlinesEnabled":
      scanlinesEnabled = val
      if (scanlinesEnabled) initWarpGL()
      break
    case "scanlineAmount":
      scanlineAmount = val
      break
    case "barCompensation":
      compensation = val
      break
    case "barGlow":
      glow = val
      break
    case "innerMovement":
      innerMovement = val
      break
    case "showStars":
      showStars = val
      break
    case "starColor":
      starColor = val
      break
    case "starOpacity":
      starOpacity = val
      break
    case "starGlow":
      starGlow = val
      break
    case "starBlur":
      starfield.style.filter = `blur(${val / 2}px)`
      break
    case "xPercent":
      xPercent = val
      break
    case "yPercent":
      yPercent = val
      break
    case "logoXPercent":
      logoXPercent = val
      break
    case "logoYPercent":
      logoYPercent = val
      break
    case "shakeSpeed":
      movementSpeed = val
      break
    case "shakeRadius":
      movementRadius = val
      break
    case "roundedBars":
      roundedBars = val
      break
    case "shadowX":
      shadowX = val
      break
    case "shadowY":
      shadowY = val
      break
    case "shadowBlur":
      shadowBlur = val
      break
    case "shadowOpacity":
      shadowOpacity = val
      break

    default:
      // console.error(`Unknown customization option: ${name}`)
      break
  }
}

document.addEventListener("DOMContentLoaded", (event) => {
  livelyAudioListener([0])
})
