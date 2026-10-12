import { drawBird, drawThunder, drawThunderCloud, OBJECT_SIZE, thunderPhase } from '../../engine/objects'
import { toScreen, wrapOffset } from '../../engine/scroll'
import { isAlive } from '../../engine/survival'
import { drawCharacter } from '../../game/sprite'
import { colors, fonts } from '../../theme'
import { birdPosition } from './hazards'
import { PLAYER_SIZE, SCROLL, STAGE_HEIGHT, STAGE_WIDTH } from './constants'
import type { CloudState } from './step'

// 雲のぼりの描画。座標はステージ座標（960×540）のまま描く（canvas 側で 2倍に拡大する）
// 見た目のルールは DESIGN.md：1ドット＝2px、グラデーションなし、空は単色
// 足場の雲は「形は岩の足場のまま、色だけ雲（白＋水色の影）」（野上さん承認）。背景の遠い雲は、足場の白と見分けがつくよう水色にした

const DOT = 2

// 遠い雲（水色）。スクロールの 0.3 倍で流し、同じ模様をくり返す
const FAR_TILE = 540 // くり返しの高さ（px）
const FAR_CLOUDS = [
  { x: 140, y: 60, r: 3 },
  { x: 700, y: 170, r: 4 },
  { x: 380, y: 300, r: 3 },
  { x: 860, y: 400, r: 3 },
  { x: 90, y: 450, r: 4 },
]

function drawPixelCloud(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number) {
  // 1ドットの升目で、丸いふくらみを3つ並べる
  const bumps = [
    { x: -radius * 1.1, y: radius * 0.25, r: radius * 0.75 },
    { x: 0, y: -radius * 0.2, r: radius },
    { x: radius * 1.2, y: radius * 0.25, r: radius * 0.7 },
  ]
  for (const b of bumps) {
    for (let y = -b.r; y <= b.r; y += DOT) {
      for (let x = -b.r; x <= b.r; x += DOT) {
        if (x * x + y * y <= b.r * b.r) ctx.fillRect(Math.round((cx + b.x + x) / DOT) * DOT, Math.round((cy + b.y + y) / DOT) * DOT, DOT, DOT)
      }
    }
  }
}

let farCache: HTMLCanvasElement | null = null
function farClouds(): HTMLCanvasElement {
  if (farCache) return farCache
  const c = document.createElement('canvas')
  c.width = STAGE_WIDTH
  c.height = FAR_TILE
  const g = c.getContext('2d')!
  g.fillStyle = colors.cloud.shadow
  for (const f of FAR_CLOUDS) drawPixelCloud(g, f.x, f.y, f.r * 10)
  farCache = c
  return c
}

function drawSky(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.fillStyle = colors.sky.main
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  const shift = wrapOffset(offset * 0.3, FAR_TILE)
  const tile = farClouds()
  for (let y = shift - FAR_TILE; y < STAGE_HEIGHT; y += FAR_TILE) ctx.drawImage(tile, 0, Math.round(y))
}

function drawPlatforms(ctx: CanvasRenderingContext2D, state: CloudState) {
  for (const p of state.platforms) {
    const s = toScreen(SCROLL, state.scroll, p.x, p.y)
    if (s.y > STAGE_HEIGHT || s.y + p.height < 0) continue
    ctx.fillStyle = colors.cloud.main
    ctx.fillRect(s.x, s.y, p.width, p.height)
    ctx.fillStyle = colors.cloud.shadow
    ctx.fillRect(s.x, s.y + Math.min(p.height, 16) - DOT * 3, p.width, DOT * 3)
  }
}

// 「!」（4×10マス）。鳥が出てくる画面の端に出す
function drawExclamation(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const rows = ['.OO.', 'ORRO', 'ORRO', 'ORRO', 'ORRO', '.OO.', '....', '.OO.', 'ORRO', '.OO.']
  rows.forEach((row, r) =>
    [...row].forEach((cell, c) => {
      if (cell === '.') return
      ctx.fillStyle = cell === 'O' ? colors.ink.main : colors.object.thunder.warning
      ctx.fillRect(x + c * DOT, y + r * DOT, DOT, DOT)
    }),
  )
}

function drawHazards(ctx: CanvasRenderingContext2D, state: CloudState) {
  const now = state.scroll.elapsed
  for (const t of state.hazards.thunders) {
    const phase = thunderPhase(t.startedAt, now)
    drawThunderCloud(ctx, t.x + OBJECT_SIZE.bolt.width / 2, 0, phase)
    drawThunder(ctx, t.x, 24, STAGE_HEIGHT, phase, now)
  }
  for (const b of state.hazards.birds) {
    const p = birdPosition(b, now)
    if (p.phase === 'warning') {
      if (Math.floor(now * 10) % 2 === 0) drawExclamation(ctx, b.dir > 0 ? 8 : STAGE_WIDTH - 8 - 4 * DOT, p.y + 4)
    } else {
      drawBird(ctx, p.x, p.y, now, b.dir)
    }
  }
}

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

export type PlayerLook = { color: string; name: string }

// showNames：カウントダウン中だけ名前を出す（Jump the highest と同じ）
export function render(ctx: CanvasRenderingContext2D, state: CloudState, looks: Record<string, PlayerLook>, showNames: boolean) {
  drawSky(ctx, state.scroll.offset)
  drawPlatforms(ctx, state)
  for (const c of state.climbers) {
    if (!isAlive(state.survival, c.playerId)) continue
    const look = looks[c.playerId]
    const s = toScreen(SCROLL, state.scroll, c.x, c.y)
    drawCharacter(ctx, s.x, s.y, PLAYER_SIZE, look?.color ?? colors.ui.text, c.facing)
    if (showNames && look?.name) drawName(ctx, look.name, look.color, s.x, s.y)
  }
  drawHazards(ctx, state)
}
