import { drawCoin, OBJECT_SIZE } from '../../engine/objects'
import { toScreen, wrapOffset } from '../../engine/scroll'
import { drawCharacter } from '../../game/sprite'
import { colors, fonts } from '../../theme'
import { GROUND_Y, PLAYER_SIZE, SCROLL, STAGE_HEIGHT, STAGE_WIDTH, TIME_LIMIT } from './constants'
import type { CoinState } from './step'

// コイン集めの描画。座標はステージ座標（960×540）のまま描く（canvas 側で 2倍に拡大する）
// 見た目のルールは DESIGN.md：1ドット＝2px、グラデーションなし。点数は画面に出さない

const DOT = 2
const CLOUD_PERIOD = 640 // 背景の雲をくり返す間隔
const CLOUD_SPEED = 0.25 // 背景は足場より遅く流して奥行きを出す

// 雲（ドットの塊）。(x, y) が左上
function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = colors.cloud.shadow
  ctx.fillRect(x + DOT * 4, y + DOT * 8, DOT * 24, DOT * 3)
  ctx.fillStyle = colors.cloud.main
  ctx.fillRect(x + DOT * 4, y + DOT * 3, DOT * 24, DOT * 6)
  ctx.fillRect(x + DOT * 8, y, DOT * 10, DOT * 4)
  ctx.fillRect(x, y + DOT * 5, DOT * 32, DOT * 4)
}

function drawSky(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.fillStyle = colors.sky.main
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  const shift = wrapOffset(offset * CLOUD_SPEED, CLOUD_PERIOD)
  for (let i = -1; i <= STAGE_WIDTH / CLOUD_PERIOD + 1; i++) {
    const x = i * CLOUD_PERIOD - shift
    drawCloud(ctx, x + 60, 70)
    drawCloud(ctx, x + 380, 150)
  }
}

function drawGround(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = colors.dirt.main
  ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, STAGE_HEIGHT - GROUND_Y)
  ctx.fillStyle = colors.grass.main
  ctx.fillRect(0, GROUND_Y, STAGE_WIDTH, DOT * 4)
  ctx.fillStyle = colors.ink.main
  ctx.fillRect(0, GROUND_Y - DOT, STAGE_WIDTH, DOT)
}

function drawPlatforms(ctx: CanvasRenderingContext2D, state: CoinState) {
  for (const p of state.platforms) {
    if (p.id === 'ground') continue
    const s = toScreen(SCROLL, state.scroll, p.x, p.y)
    if (s.x > STAGE_WIDTH || s.x + p.width < 0) continue
    ctx.fillStyle = colors.ink.main
    ctx.fillRect(s.x - DOT, s.y - DOT, p.width + DOT * 2, p.height + DOT * 2)
    ctx.fillStyle = colors.dirt.main
    ctx.fillRect(s.x, s.y, p.width, p.height)
    ctx.fillStyle = colors.grass.main
    ctx.fillRect(s.x, s.y, p.width, DOT * 4)
  }
}

function drawCoins(ctx: CanvasRenderingContext2D, state: CoinState) {
  const t = state.scroll.elapsed
  const hit = OBJECT_SIZE.coin.hit
  for (const c of state.coins) {
    const s = toScreen(SCROLL, state.scroll, c.x - hit.x, c.y - hit.y) // 当たり判定の枠 → 見た目の左上
    if (s.x > STAGE_WIDTH || s.x + OBJECT_SIZE.coin.width < 0) continue
    drawCoin(ctx, s.x, s.y, t + c.x * 0.003) // 場所ごとに回り始めをずらす
  }
}

// コインを取った場所の光（4本の短い線が広がる）
function drawPops(ctx: CanvasRenderingContext2D, state: CoinState) {
  ctx.fillStyle = colors.object.coin.shine
  for (const p of state.pops) {
    const s = toScreen(SCROLL, state.scroll, p.x, p.y)
    const r = DOT * (3 + Math.floor(p.age * 20))
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(s.x + dx * r - DOT, s.y + dy * r - DOT, DOT * 2, DOT * 2)
  }
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

// 角を欠いた箱（TIME の箱と同じ形。Jump the highest の drawPanel と同じ）。border で枠の色を変えられる
function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, border: string = colors.frame.border) {
  ctx.fillStyle = border
  ctx.fillRect(x + 6, y, w - 12, h)
  ctx.fillRect(x, y + 6, w, h - 12)
  ctx.fillStyle = colors.frame.fill
  ctx.fillRect(x + 9, y + 3, w - 18, h - 6)
  ctx.fillRect(x + 3, y + 9, w - 6, h - 18)
}

// 1人分の枚数の箱：キャラの絵 + 「×枚数」。highlight は勝った人（枠を山吹色にする）
function drawCountChip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, count: number, size: number, highlight: boolean) {
  drawPanel(ctx, x, y, w, h, highlight ? colors.ui.start : colors.frame.border)
  const icon = size
  drawCharacter(ctx, x + 12, y + (h - icon) / 2, icon, color, 1)
  ctx.font = `bold ${size >= 40 ? (w >= 130 ? 36 : 28) : 24}px ${fonts.dot}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colors.ink.main
  ctx.fillText(`×${count}`, x + 12 + icon + 8, y + h / 2 + 2)
}

// 遊んでいる間：残り時間（上の真ん中）と、全員のコインの枚数（下の地面の部分。キャラや足場に重ならない）
function drawHud(ctx: CanvasRenderingContext2D, state: CoinState, looks: Record<string, PlayerLook>) {
  const remaining = Math.max(0, Math.ceil(TIME_LIMIT - state.scroll.elapsed))
  drawPanel(ctx, STAGE_WIDTH / 2 - 120, 18, 240, 52)
  ctx.font = `28px ${fonts.dot}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = colors.ink.main
  ctx.fillText(`TIME 00:${String(remaining).padStart(2, '0')}`, STAGE_WIDTH / 2, 45)

  const n = state.runners.length
  const w = Math.min(112, Math.floor((STAGE_WIDTH - 40) / n) - 8)
  const total = n * (w + 8) - 8
  state.runners.forEach((r, i) => {
    drawCountChip(ctx, (STAGE_WIDTH - total) / 2 + i * (w + 8), GROUND_Y + 28, w, 48, looks[r.playerId]?.color ?? colors.ui.text, state.scores[r.playerId] ?? 0, 20, false)
  })
}

// 終わったとき：集めた枚数を、多い順に上に並べる。勝った人（引き分けなら全員）は枠が山吹色
function drawResult(ctx: CanvasRenderingContext2D, state: CoinState, looks: Record<string, PlayerLook>) {
  const ranked = [...state.runners].sort((a, b) => (state.scores[b.playerId] ?? 0) - (state.scores[a.playerId] ?? 0))
  const n = ranked.length
  const w = Math.min(140, Math.floor((STAGE_WIDTH - 40) / n) - 8)
  const total = n * (w + 8) - 8
  ranked.forEach((r, i) => {
    drawCountChip(ctx, (STAGE_WIDTH - total) / 2 + i * (w + 8), 24, w, 72, looks[r.playerId]?.color ?? colors.ui.text, state.scores[r.playerId] ?? 0, 40, state.winners.includes(r.playerId))
  })
}

export type PlayerLook = { color: string; name: string }

// showNames：カウントダウン中だけ名前を出す（遊んでいる間は動きの邪魔になるため。Jump the highest と同じ）
export function render(ctx: CanvasRenderingContext2D, state: CoinState, looks: Record<string, PlayerLook>, showNames: boolean) {
  drawSky(ctx, state.scroll.offset)
  drawGround(ctx)
  drawPlatforms(ctx, state)
  drawCoins(ctx, state)
  for (const r of state.runners) {
    const look = looks[r.playerId]
    const s = toScreen(SCROLL, state.scroll, r.x, r.y)
    drawCharacter(ctx, s.x, s.y, PLAYER_SIZE, look?.color ?? colors.ui.text, r.facing, r.stunTime > 0)
    if (showNames && look?.name) drawName(ctx, look.name, look.color, s.x, s.y)
  }
  drawPops(ctx, state)
  if (state.finished) drawResult(ctx, state, looks)
  else drawHud(ctx, state, looks)
}
