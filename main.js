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
let shockwaveEnabled = false // expanding ripple ring from center on beats
let reduceFlashing = false // accessibility: damp flashing / rapid motion

let beatEnergyAvg = 0 // slow rolling loudness baseline for beat detection
let beatCooldownFrames = 0 // min-gap counter so one beat doesn't double-trigger
let shakeImpulse = 0 // decaying beat-shake magnitude
let shockwaves = [] // active ripples: { radius, alpha }

let globalRotation = 0 // accumulated rotation, radians
let rainbowOffset = 0 // accumulated hue offset for the rainbow cycle
let smoothedAudio = [] // persistent buffer for bar smoothing
let pulseScale = 1 // smoothed scale factor for beat pulse

const debug = document.getElementById("debug")
const middle = document.getElementById("middle")
const canvas = document.getElementById("canvas")
const visualizer = document.getElementById("visualizer")
const starfield = document.getElementById("starfield")

// Background slideshow layers + wrapper (for blur)
const bgWrapper = document.getElementById("bg-layers")
const bgLayers = [document.getElementById("bgA"), document.getElementById("bgB")]
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

  let innerRadius = (ctx.canvas.height / 2) * (innerPercent / 100)
  let maxLength = (ctx.canvas.height / 2 - innerRadius) * (barPercent / 100)

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.lineCap = roundedBars ? "round" : "butt"
  ctx.shadowBlur = glow

  // Visualizer location (+ shake/wobble)
  let xPos = ctx.canvas.width * (xPercent / 100)
  xPos += (noise(axis) - 0.5) * ((innerRadius * movementRadius) / 100)
  let yPos = ctx.canvas.height * (yPercent / 100)
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
    if (shockwaveEnabled) shockwaves.push({ radius: innerRadius, alpha: 0.6 * flashK })
  }

  // Beat shake: a quick positional kick that decays every frame
  shakeImpulse *= 0.85
  if (shakeImpulse > 0.001) {
    let amt = shakeImpulse * 120
    xPos += (Math.random() - 0.5) * amt
    yPos += (Math.random() - 0.5) * amt
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

  // Shockwave ripples expanding from the visualizer center on detected beats
  if (shockwaves.length) {
    ctx.lineCap = "butt"
    ctx.shadowBlur = glow
    for (let i = shockwaves.length - 1; i >= 0; i--) {
      let s = shockwaves[i]
      s.radius += 12
      s.alpha -= 0.02
      if (s.alpha <= 0) {
        shockwaves.splice(i, 1)
        continue
      }
      let hue = barHue(0.5, 0.5)
      ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${s.alpha})`
      ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(xPos, yPos, s.radius, 0, Math.PI * 2)
      ctx.stroke()
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

function livelyPropertyListener(name, val) {
  // debug.textContent += `Name: ${name} Val: ${val}`
  switch (name) {
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
      applyBgBlur(val)
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
    case "reduceFlashing":
      reduceFlashing = val
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
