import { isAlive } from '../../engine/survival'
import { drawCharacter } from '../../game/sprite'
import { colors, fonts } from '../../theme'
import { GROUND_Y, PLAYER_SIZE, MAGMA_Y, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { isShrinking, type PushOutState } from './step'

// おしくらまんじゅうの描画。背景（青空・太陽・雲）は Jump the highest（src/game/render.ts）と同じ絵
// マグマの描き方は src/games/magma-rush/render.ts に合わせる。見た目のルールは DESIGN.md

const DOT = 2

// ドット絵風にするため、円も四角の組み合わせで描く
function drawPixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, cell: number) {
  for (let y = -r; y <= r; y += cell) {
    for (let x = -r; x <= r; x += cell) {
      if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, cell + 1, cell + 1)
    }
  }
}

function drawSun(ctx: CanvasRenderingContext2D) {
  const cx = 90
  const cy = 90
  ctx.fillStyle = colors.sun.ray
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i
    for (let d = 44; d <= 64; d += 6) {
      ctx.fillRect(cx + Math.cos(angle) * d - 3, cy + Math.sin(angle) * d - 3, 6, 6)
    }
  }
  ctx.fillStyle = colors.sun.main
  drawPixelCircle(ctx, cx, cy, 34, 6)
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const s = 6 * scale
  ctx.fillStyle = colors.cloud.shadow
  drawPixelCircle(ctx, x - 30 * scale, y + 6 * scale, 22 * scale, s)
  drawPixelCircle(ctx, x + 32 * scale, y + 6 * scale, 22 * scale, s)
  ctx.fillStyle = colors.cloud.main
  drawPixelCircle(ctx, x - 30 * scale, y, 22 * scale, s)
  drawPixelCircle(ctx, x, y - 12 * scale, 30 * scale, s)
  drawPixelCircle(ctx, x + 32 * scale, y, 22 * scale, s)
}

const CLOUDS = [
  { x: 280, y: 190, scale: 1.1 },
  { x: 610, y: 165, scale: 1.2 },
  { x: 150, y: 290, scale: 1 },
  { x: 820, y: 260, scale: 1 },
]

function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

// マグマ（画面の下端まで）。表面は時間とともに4px単位で波打つ
function drawMagma(ctx: CanvasRenderingContext2D, t: number) {
  const col = DOT * 8
  for (let x = 0; x < STAGE_WIDTH; x += col) {
    const y = MAGMA_Y + Math.round((Math.sin(t * 4 + x / 40) + 1) * 1.5) * 2 - 3
    ctx.fillStyle = colors.magma.surface
    ctx.fillRect(x, y, col, DOT * 3)
    ctx.fillStyle = colors.magma.main
    ctx.fillRect(x, y + DOT * 3, col, STAGE_HEIGHT - y)
  }
  ctx.fillStyle = colors.magma.deep
  ctx.fillRect(0, MAGMA_Y + 14, STAGE_WIDTH, STAGE_HEIGHT)
  ctx.fillStyle = colors.magma.surface
  for (let i = 0; i < 12; i++) {
    if (Math.floor(t * 3 + i * 0.7) % 3 !== 0) continue
    const x = Math.floor((hash(i) * STAGE_WIDTH) / (DOT * 4)) * DOT * 4
    ctx.fillRect(x, MAGMA_Y + 18 + Math.floor(hash(i + 50) * 14), DOT * 3, DOT * 3)
  }
}

// 足場（草の乗った土の島）。left〜right が乗れる範囲。warn が true の間は縁を点滅させる（もうすぐ崩れる合図）
export function drawPlatform(ctx: CanvasRenderingContext2D, left: number, right: number, warnEdge = false) {
  const w = right - left
  ctx.fillStyle = colors.dirt.main
  ctx.fillRect(left, GROUND_Y, w, STAGE_HEIGHT - GROUND_Y)
  // 土のところどころに濃い点を置いて、土らしく見せる
  ctx.fillStyle = colors.canyon.ledge
  for (let x = 0; x < w; x += DOT * 8) {
    ctx.fillRect(left + x + Math.floor(hash(left + x) * 4) * DOT, GROUND_Y + 14 + Math.floor(hash(x + 7) * 3) * 8, DOT * 3, DOT * 2)
  }
  ctx.fillStyle = colors.grass.main
  ctx.fillRect(left, GROUND_Y, w, 8)
  if (warnEdge) {
    ctx.fillStyle = colors.magma.surface
    ctx.fillRect(left, GROUND_Y, 16, 8)
    ctx.fillRect(right - 16, GROUND_Y, 16, 8)
  }
}

// 背景・マグマ・足場まで（キャラと文字の手前まで）
export function drawStage(ctx: CanvasRenderingContext2D, left: number, right: number, t: number, warnEdge = false) {
  ctx.fillStyle = colors.sky.main
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  drawSun(ctx)
  for (const c of CLOUDS) drawCloud(ctx, c.x, c.y, c.scale)
  drawMagma(ctx, t)
  // 左右の壁（Jump the highest と同じ。マグマの上にそびえる）
  ctx.fillStyle = colors.wall.main
  ctx.fillRect(0, 0, WALL_WIDTH, STAGE_HEIGHT - 40)
  ctx.fillRect(STAGE_WIDTH - WALL_WIDTH, 0, WALL_WIDTH, STAGE_HEIGHT - 40)
  drawPlatform(ctx, left, right, warnEdge)
}

export type PlayerLook = { color: string; name: string }

// キャラの頭上の名前（Jump the highest と同じ：10ドット・太字、キャラの色に濃紺のふち）
function drawName(ctx: CanvasRenderingContext2D, name: string, color: string, x: number, top: number) {
  ctx.font = `bold 20px ${fonts.dot}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.lineWidth = 4
  ctx.lineJoin = 'round'
  ctx.strokeStyle = colors.ink.main
  const cx = x + PLAYER_SIZE / 2
  const y = Math.max(20, top - 4)
  ctx.strokeText(name, cx, y)
  ctx.fillStyle = color
  ctx.fillText(name, cx, y)
}

// showNames：カウントダウン中だけ名前を出す（遊んでいる間は動きの邪魔になるため。Jump the highest と同じ）
export function render(ctx: CanvasRenderingContext2D, state: PushOutState, looks: Record<string, PlayerLook>, showNames: boolean) {
  // 足場が狭まっている間は、縁を点滅させる（もうすぐ崩れる合図）
  const warn = isShrinking(state) && Math.floor(state.elapsed * 4) % 2 === 0
  const p = state.platform
  drawStage(ctx, p.x, p.x + p.width, state.elapsed, warn)
  for (const r of state.runners) {
    if (!isAlive(state.survival, r.playerId)) continue // 脱落した人は描かない
    const look = looks[r.playerId]
    drawCharacter(ctx, r.x, r.y, PLAYER_SIZE, look?.color ?? colors.ui.text, r.facing, r.stunTime > 0)
    if (showNames && look?.name) drawName(ctx, look.name, look.color, r.x, r.y)
  }
}
