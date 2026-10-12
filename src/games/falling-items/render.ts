import { drawCoin, drawPoisonMushroom } from '../../engine/objects'
import { drawCharacter } from '../../game/sprite'
import { colors, fonts } from '../../theme'
import { GROUND_HEIGHT, GROUND_Y, PLAYER_SIZE, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import type { FallingState } from './step'

// 落下物避けの描画。座標はステージ座標（960×540）のまま描く（canvas 側で 2倍に拡大する）
// 背景は Jump the highest と同じ（青空・太陽・雲・草の地面・壁）。見た目のルールは DESIGN.md

export type PlayerLook = { color: string; name: string }

const CLOUDS = [
  { x: 280, y: 190, scale: 1.1 },
  { x: 610, y: 165, scale: 1.2 },
  { x: 150, y: 290, scale: 1 },
  { x: 820, y: 260, scale: 1 },
]

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
    for (let d = 44; d <= 64; d += 6) ctx.fillRect(cx + Math.cos(angle) * d - 3, cy + Math.sin(angle) * d - 3, 6, 6)
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

function drawBackground(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = colors.sky.main
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  drawSun(ctx)
  for (const c of CLOUDS) drawCloud(ctx, c.x, c.y, c.scale)
  // 地面（上に草）と左右の壁
  ctx.fillStyle = colors.dirt.main
  ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, GROUND_HEIGHT)
  ctx.fillStyle = colors.grass.main
  ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, 8)
  ctx.fillStyle = colors.wall.main
  ctx.fillRect(0, 0, WALL_WIDTH, GROUND_Y)
  ctx.fillRect(STAGE_WIDTH - WALL_WIDTH, 0, WALL_WIDTH, GROUND_Y)
}

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

// 終了の瞬間に、取った点数だけを画面の上に並べる（ラウンド中は出さない）
const SCORE_SLOT = 110
function drawScores(ctx: CanvasRenderingContext2D, state: FallingState, looks: Record<string, PlayerLook>) {
  const n = state.runners.length
  const left = (STAGE_WIDTH - n * SCORE_SLOT) / 2
  const best = Math.max(...Object.values(state.scores))
  state.runners.forEach((r, i) => {
    const color = looks[r.playerId]?.color ?? colors.ui.text
    const cx = left + i * SCORE_SLOT + SCORE_SLOT / 2
    drawCharacter(ctx, cx - 40, 24, 28, color, 1)
    ctx.font = `bold 32px ${fonts.dot}`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 6
    ctx.lineJoin = 'round'
    ctx.strokeStyle = colors.ink.main
    const text = String(state.scores[r.playerId])
    ctx.strokeText(text, cx - 6, 38)
    ctx.fillStyle = state.scores[r.playerId] === best ? colors.ui.finish : colors.frame.fill
    ctx.fillText(text, cx - 6, 38)
  })
}

// showNames：カウントダウン中だけ名前を出す（遊んでいる間は動きの邪魔になるため。Jump the highest と同じ）
export function render(ctx: CanvasRenderingContext2D, state: FallingState, looks: Record<string, PlayerLook>, showNames: boolean) {
  drawBackground(ctx)
  for (const it of state.items) {
    // コインの回転の位相を物ごとにずらす（そろって回ると不自然）
    if (it.kind === 'coin') drawCoin(ctx, it.x, it.y, state.elapsed + Number(it.id.slice(1)) * 0.13)
    else drawPoisonMushroom(ctx, it.x, it.y, state.elapsed)
  }
  for (const r of state.runners) {
    const look = looks[r.playerId]
    drawCharacter(ctx, r.x, r.y, PLAYER_SIZE, look?.color ?? colors.ui.text, r.facing, r.stunTime > 0)
    if (showNames && look?.name) drawName(ctx, look.name, look.color, r.x, r.y)
  }
  if (state.finished) drawScores(ctx, state, looks)
}
