import {
  GAME_DURATION,
  GROUND_HEIGHT,
  PLAYER_SIZE,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'
import { drawCharacter } from './sprite'
import type { GameState } from './types'

// ラフ画（青空・太陽・雲）に合わせた色
const COLORS = {
  skyTop: '#5bb8f5',
  skyBottom: '#bfe6ff',
  sun: '#ffd23f',
  sunRay: '#ffb703',
  cloud: '#ffffff',
  cloudShadow: '#dceefa',
  ground: '#7a5a3a',
  grass: '#5cb85c',
  wall: '#8a9bb0',
  outline: '#1a1a1a',
  panel: '#ffffff',
  text: '#1a1a1a',
}

// 雲の位置（ラフ画の配置をステージ座標に写したもの）。毎コマ同じ位置に描く
const CLOUDS = [
  { x: 280, y: 190, scale: 1.1 },
  { x: 610, y: 165, scale: 1.2 },
  { x: 150, y: 290, scale: 1 },
  { x: 820, y: 260, scale: 1 },
]

// 足元の高さ（上が正）を Canvas の y 座標（下が正、キャラの上端）に変換する
function toScreenTop(y: number): number {
  return STAGE_HEIGHT - GROUND_HEIGHT - y - PLAYER_SIZE
}

// ドット絵風にするため、円も四角の組み合わせで描く
function drawPixelCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, cell: number) {
  for (let y = -r; y <= r; y += cell) {
    for (let x = -r; x <= r; x += cell) {
      // 大きさが小数のときにマスの間に細い隙間が見えないよう、少し重ねて塗る
      if (x * x + y * y <= r * r) ctx.fillRect(cx + x, cy + y, cell + 1, cell + 1)
    }
  }
}

function drawSun(ctx: CanvasRenderingContext2D) {
  const cx = 90
  const cy = 90
  ctx.fillStyle = COLORS.sunRay
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i
    for (let d = 44; d <= 64; d += 6) {
      ctx.fillRect(cx + Math.cos(angle) * d - 3, cy + Math.sin(angle) * d - 3, 6, 6)
    }
  }
  ctx.fillStyle = COLORS.sun
  drawPixelCircle(ctx, cx, cy, 34, 6)
}

function drawCloud(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const s = 6 * scale
  ctx.fillStyle = COLORS.cloudShadow
  drawPixelCircle(ctx, x - 30 * scale, y + 6 * scale, 22 * scale, s)
  drawPixelCircle(ctx, x + 32 * scale, y + 6 * scale, 22 * scale, s)
  ctx.fillStyle = COLORS.cloud
  drawPixelCircle(ctx, x - 30 * scale, y, 22 * scale, s)
  drawPixelCircle(ctx, x, y - 12 * scale, 30 * scale, s)
  drawPixelCircle(ctx, x + 32 * scale, y, 22 * scale, s)
}

// 角を落とした四角（ドット風の丸み）
function drawPanel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = COLORS.outline
  ctx.fillRect(x + 6, y, w - 12, h)
  ctx.fillRect(x, y + 6, w, h - 12)
  ctx.fillStyle = COLORS.panel
  ctx.fillRect(x + 9, y + 3, w - 18, h - 6)
  ctx.fillRect(x + 3, y + 9, w - 6, h - 18)
}

// 空や雲の白に溶けて名前が読みにくい色（src/lib/players.ts の 青・緑・黄・水色）。この色の名前だけ黒いふちを付ける
// 8色を空の上に並べて見比べて決めた。赤・橙・紫・桃はふちなしでも読める
const NAME_OUTLINE_COLORS = new Set(['#55aaff', '#55dd55', '#ffcc33', '#33dddd'])

// キャラの頭上に名前を描く。誰の名前か一目でわかるようキャラと同じ色にし、太字で少し大きめにする
// 高く跳んで画面上端に近づいたときも名前が切れないよう、上端より上には出さない
function drawName(ctx: CanvasRenderingContext2D, name: string, color: string, x: number, top: number) {
  ctx.font = 'bold 20px "DotGothic16", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  const cx = x + PLAYER_SIZE / 2
  const y = Math.max(20, top - 4)
  if (NAME_OUTLINE_COLORS.has(color.toLowerCase())) {
    ctx.lineWidth = 4
    ctx.lineJoin = 'round'
    ctx.strokeStyle = COLORS.outline
    ctx.strokeText(name, cx, y)
  }
  ctx.fillStyle = color
  ctx.fillText(name, cx, y)
}

// 1コマ分を描画する。座標はステージ座標（960×540）のまま描く
// names：playerId → 頭上に出す名前（省略・該当なしなら名前は出さない）
export function render(ctx: CanvasRenderingContext2D, state: GameState, names: Record<string, string> = {}) {
  // 空（上ほど濃い青）
  const sky = ctx.createLinearGradient(0, 0, 0, STAGE_HEIGHT - GROUND_HEIGHT)
  sky.addColorStop(0, COLORS.skyTop)
  sky.addColorStop(1, COLORS.skyBottom)
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)

  drawSun(ctx)
  for (const c of CLOUDS) drawCloud(ctx, c.x, c.y, c.scale)

  // 地面（上に草）と左右の壁
  ctx.fillStyle = COLORS.ground
  ctx.fillRect(0, STAGE_HEIGHT - GROUND_HEIGHT, STAGE_WIDTH, GROUND_HEIGHT)
  ctx.fillStyle = COLORS.grass
  ctx.fillRect(0, STAGE_HEIGHT - GROUND_HEIGHT, STAGE_WIDTH, 8)
  ctx.fillStyle = COLORS.wall
  ctx.fillRect(0, 0, WALL_WIDTH, STAGE_HEIGHT - GROUND_HEIGHT)
  ctx.fillRect(STAGE_WIDTH - WALL_WIDTH, 0, WALL_WIDTH, STAGE_HEIGHT - GROUND_HEIGHT)

  // 名前はキャラより先に描く。積み重なったとき、下の人の名前が上の人の体に隠れ、
  // 上の人の名前の上に重ならないようにするため（いちばん上の人の名前は必ず見える）
  for (const p of state.players) {
    const name = names[p.playerId]
    if (name) drawName(ctx, name, p.color, p.x, toScreenTop(p.y))
  }

  // プレイヤー（羽のある子のドット絵）。弾かれている間は目を閉じる
  for (const p of state.players) {
    drawCharacter(ctx, p.x, toScreenTop(p.y), PLAYER_SIZE, p.color, p.facing, p.stunTime > 0)
  }

  ctx.font = '28px "DotGothic16", sans-serif'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'
  ctx.fillStyle = COLORS.text

  // 残り時間（切り上げで表示し、0 になった瞬間に終了）。ラフ画どおり「TIME 00:10」の形
  const remaining = Math.max(0, Math.ceil(GAME_DURATION - state.elapsed))
  drawPanel(ctx, STAGE_WIDTH / 2 - 120, 18, 240, 52)
  ctx.fillStyle = COLORS.text
  ctx.textAlign = 'center'
  ctx.fillText(`TIME 00:${String(remaining).padStart(2, '0')}`, STAGE_WIDTH / 2, 45)

  // ラウンド表示。複数ラウンド制は今後の予定のため、今は番号を付けずに「Round」とだけ出す
  drawPanel(ctx, STAGE_WIDTH - WALL_WIDTH - 150, 22, 130, 44)
  ctx.fillStyle = COLORS.text
  ctx.fillText('Round', STAGE_WIDTH - WALL_WIDTH - 85, 45)
}
