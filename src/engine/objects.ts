import { colors } from '../theme'

// ミニゲームに出てくる物の絵と大きさ：コイン・毒キノコ・鳥・雷。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 絵はキャラ（src/game/sprite.ts）と同じ作り：文字の升目で持ち、1マス＝2px のドットで塗る（画像ファイルを使わない）
// 座標は src/engine/ と同じ（左上が原点、下向きが正）。x・y は、どの絵も「当たり判定の枠の左上」
// 当たり判定は見た目より少し小さくして、「当たっていないのに脱落した」と感じにくくしている（OBJECT_SIZE の hit）

export const DOT = 2 // 1マスの大きさ（px）

// 見た目の大きさ（size）と、当たり判定の枠（hit。size の中に収まる）。x・y は size の左上
export const OBJECT_SIZE = {
  coin: { width: 24, height: 24, hit: { x: 2, y: 2, width: 20, height: 20 } },
  poison: { width: 28, height: 28, hit: { x: 3, y: 4, width: 22, height: 22 } },
  bird: { width: 40, height: 28, hit: { x: 5, y: 6, width: 30, height: 16 } },
  bolt: { width: 24, hit: { x: 4, width: 16 } }, // 雷の柱。高さは落ちる場所によって変わる
} as const

type Rect = { x: number; y: number; width: number; height: number }

// 物の当たり判定の枠（ワールド座標）。x・y は見た目の左上
export function hitRect(kind: 'coin' | 'poison' | 'bird', x: number, y: number): Rect {
  const h = OBJECT_SIZE[kind].hit
  return { x: x + h.x, y: y + h.y, width: h.width, height: h.height }
}

// 雷の柱の当たり判定の枠。top〜bottom の縦の帯。当たるのは「落ちている」間だけ（thunderPhase が 'strike' のとき）
export function boltHitRect(x: number, top: number, bottom: number): Rect {
  const h = OBJECT_SIZE.bolt.hit
  return { x: x + h.x, y: top, width: h.width, height: bottom - top }
}

// ---- 雷の時間割 ----
// 雲が光って（予告）→ 落ちる。予告の間は当たらないので、よけられる
export const THUNDER_WARNING_SECONDS = 0.8
export const THUNDER_STRIKE_SECONDS = 0.3

export type ThunderPhase = 'idle' | 'warning' | 'strike'

// 雷が鳴り始めた時刻 startedAt（秒）から見た、今 now（秒）の段階
export function thunderPhase(startedAt: number, now: number): ThunderPhase {
  const t = now - startedAt
  if (t < 0) return 'idle'
  if (t < THUNDER_WARNING_SECONDS) return 'warning'
  if (t < THUNDER_WARNING_SECONDS + THUNDER_STRIKE_SECONDS) return 'strike'
  return 'idle'
}

// ---- ドット絵 ----

// 升目の文字 → 色。'.' は透明
type Palette = Record<string, string>

// 右が足りない行は '.' で埋めて、width 幅にそろえる（行の頭の '.' だけ数えればよいように）
export function padRows(rows: string[], width: number): string[] {
  return rows.map((r) => r.padEnd(width, '.'))
}

function drawGrid(ctx: CanvasRenderingContext2D, rows: string[], palette: Palette, x: number, y: number, flip = false, px = DOT) {
  const width = rows[0].length
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < width; c++) {
      const cell = rows[r][flip ? width - 1 - c : c]
      if (cell === '.') continue
      ctx.fillStyle = palette[cell]
      ctx.fillRect(x + c * px, y + r * px, px, px)
    }
  }
}

const INK = colors.ink.main

// コイン（12×12マス＝24px）。O 輪郭／Y 金／S 影／W つや。回って見えるよう、横幅を 12→8→4→8 と縮めて描く
const COIN_ROWS = padRows(
  [
    '....OOOO....',
    '..OOYYYYOO..',
    '.OYYWWYYYYO.',
    '.OYWYYYYYSO.',
    'OYWYYOOYYYSO',
    'OYYYYOOYYYSO',
    'OYYYYOOYYYSO',
    'OYYYYOOYYSSO',
    '.OYYYYYYYSO.',
    '.OYYYYYYSSO.',
    '..OOSSSSOO..',
    '....OOOO....',
  ],
  12,
)
const COIN_PALETTE: Palette = { O: INK, Y: colors.object.coin.main, S: colors.object.coin.shade, W: colors.object.coin.shine }
const COIN_SPIN = [12, 8, 4, 8] // 回転の4コマの横幅（マス）
const COIN_SPIN_SECONDS = 0.6 // 1回転の時間

// 升目を横に縮める（左右対称の絵を、回って見えるように細くする）
export function squeezeRows(rows: string[], width: number): string[] {
  const source = rows[0].length
  return rows.map((row) => Array.from({ length: width }, (_, c) => row[Math.floor((c * source) / width)]).join(''))
}

// コイン。t は経過時間（秒）。回って見える
export function drawCoin(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const frame = Math.floor(((t % COIN_SPIN_SECONDS) / COIN_SPIN_SECONDS) * COIN_SPIN.length)
  const width = COIN_SPIN[frame]
  drawGrid(ctx, squeezeRows(COIN_ROWS, width), COIN_PALETTE, x + ((12 - width) / 2) * DOT, y)
}

// 毒キノコ（14×14マス＝28px）。P 笠／Q 笠の影／W 水玉／S 軸／T 軸の影／K 目／M 口。怒った顔で「毒」と一目で分かるようにした
const MUSHROOM_ROWS = padRows(
  [
    '....OOOOOO....',
    '..OOPPPPPPOO..',
    '.OPPPWWPPPPPO.',
    'OPPWWWWPPPWWPO',
    'OPPWWWWPPPWWPO',
    'OPPPWWPPPPPPPO',
    'OQPPPPPPPPPPQO',
    '.OOOOOOOOOOOO.',
    '..OSSSSSSSSO..',
    '..OSKKSSKKSO..',
    '..OSSSSSSSSO..',
    '..OSSMMMMSSO..',
    '..OTTTTTTTTO..',
    '...OOOOOOOO...',
  ],
  14,
)
const MUSHROOM_PALETTE: Palette = {
  O: INK,
  P: colors.object.poison.cap,
  Q: colors.object.poison.capDark,
  W: colors.object.poison.spot,
  S: colors.object.poison.stalk,
  T: colors.object.poison.stalkShade,
  K: INK,
  M: colors.object.poison.mouth,
}

// 毒キノコ。t は経過時間（秒）。ゆらゆら揺れる（1ドット分、上下に）
export function drawPoisonMushroom(ctx: CanvasRenderingContext2D, x: number, y: number, t: number) {
  const bob = Math.floor(t * 4) % 2 === 0 ? 0 : DOT
  drawGrid(ctx, MUSHROOM_ROWS, MUSHROOM_PALETTE, x, y + bob)
}

// 鳥（20×14マス＝40×28px）。左向きに描く（右向きは左右反転）。O 輪郭／B 体／V 羽／L おなか／G くちばし／W 白目／K 黒目
// 羽ばたきは2コマ（羽が上・羽が下）を 0.2 秒ごとに入れ替える
const BIRD_UP = padRows(
  [
    '..........OO',
    '.........OVVO',
    '........OVVVVO',
    '.......OVVVVVVO',
    '....OOOOOOVVVVVO',
    '...OBBBBBBOVVVVO',
    '..OBBBWKBBBOVVO',
    'GGOBBBBBBBBBOOOO',
    'GGGOBBBBBBBBBBBOO',
    '..OOLLLBBBBBBBBBO',
    '....OLLLLBBBBBBBBO',
    '.....OOLLLBBBBBOO',
    '.......OOOOOOOO',
    '',
  ],
  20,
)
const BIRD_DOWN = padRows(
  [
    '',
    '',
    '',
    '',
    '....OOOOOO',
    '...OBBBBBBO',
    '..OBBBWKBBBO',
    'GGOBBBBBBBBBOOOO',
    'GGGOBBBBBBBBBBBOO',
    '..OOLLLBBBBBBBBBO',
    '....OLLLLBBBBBBBBO',
    '.....OOLLLBBBBBOO',
    '.......OVVVVVVVVO',
    '........OVVVVVVO',
  ],
  20,
)
const BIRD_PALETTE: Palette = {
  O: INK,
  B: colors.object.bird.body,
  V: colors.object.bird.wing,
  L: colors.object.bird.belly,
  G: colors.object.bird.beak,
  W: colors.character.eyeWhite,
  K: INK,
}
const BIRD_FLAP_SECONDS = 0.2

// 鳥。facing は進む向き（-1：左、1：右）。t は経過時間（秒）
export function drawBird(ctx: CanvasRenderingContext2D, x: number, y: number, t: number, facing: 1 | -1 = -1) {
  const up = Math.floor(t / BIRD_FLAP_SECONDS) % 2 === 0
  drawGrid(ctx, up ? BIRD_UP : BIRD_DOWN, BIRD_PALETTE, x, y, facing === 1)
}

// ---- 雷 ----

// 雷雲（予告のあいだ光る）。cx は雲の中心の x、top は雲の上端の y。1マス＝4px で、幅 64px・高さ 24px
const CLOUD_ROWS = padRows(
  [
    '....OOOOOO......',
    '..OOCCCCCCOO.OO.',
    '.OCCCCCCCCCCOCCO',
    'OCCCCCCCCCCCCCCO',
    'OCDDDDDDDDDDDDCO',
    '.OOOOOOOOOOOOOO.',
  ],
  16,
)
export const CLOUD_SIZE = { width: 64, height: 24 } as const
const CLOUD_PX = 4

export function drawThunderCloud(ctx: CanvasRenderingContext2D, cx: number, top: number, phase: ThunderPhase) {
  const lit = phase !== 'idle'
  const palette: Palette = {
    O: INK,
    C: lit ? colors.object.thunder.cloudDark : colors.object.thunder.cloud,
    D: lit ? colors.object.thunder.cloud : colors.object.thunder.cloudDark,
  }
  drawGrid(ctx, CLOUD_ROWS, palette, cx - CLOUD_SIZE.width / 2, top, false, CLOUD_PX)
}

// 雷。x は柱の左端（幅 24px）、top〜bottom が落ちる範囲。
// 予告：柱の位置に点線と「!」（当たらない）／落下：ぎざぎざの稲光が柱いっぱいに走る（当たる）
export function drawThunder(
  ctx: CanvasRenderingContext2D,
  x: number,
  top: number,
  bottom: number,
  phase: ThunderPhase,
  t: number,
) {
  if (phase === 'idle') return
  const w = OBJECT_SIZE.bolt.width
  if (phase === 'warning') {
    // 点線の帯（ゆっくり点滅）と、柱の下端に「!」
    ctx.fillStyle = Math.floor(t * 10) % 2 === 0 ? colors.object.thunder.warning : colors.object.thunder.bolt
    for (let y = top; y < bottom - 16; y += DOT * 8) ctx.fillRect(x + w / 2 - DOT, y, DOT * 2, DOT * 4)
    drawExclamation(ctx, x + w / 2 - DOT * 2, bottom - 20)
    return
  }
  // 稲光：2px 幅のドットでぎざぎざに折れながら落ちる。外側の輪郭 → 金色 → 白い芯
  const zig = [0, 1, 2, 1, 0, -1, -2, -1] // 折れ曲がりの位置（ドット単位）。柱の幅 24px の中に収まる大きさ
  const segments = Math.ceil((bottom - top) / (DOT * 6))
  const layers: [string, number][] = [
    [INK, DOT * 7],
    [colors.object.thunder.bolt, DOT * 5],
    [colors.object.thunder.core, DOT * 2],
  ]
  for (const [color, width] of layers) {
    ctx.fillStyle = color
    for (let i = 0; i < segments; i++) {
      const cx = x + w / 2 + zig[i % zig.length] * DOT - width / 2
      ctx.fillRect(cx, top + i * DOT * 6, width, DOT * 6 + (color === INK ? DOT : 0))
    }
  }
  // 地面（下端）の光
  ctx.fillStyle = colors.object.thunder.core
  ctx.fillRect(x + 2, bottom - DOT * 2, w - 4, DOT * 2)
}

// 「!」（4×10マス）
function drawExclamation(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const rows = padRows(['.OO.', 'ORRO', 'ORRO', 'ORRO', 'ORRO', '.OO.', '....', '.OO.', 'ORRO', '.OO.'], 4)
  drawGrid(ctx, rows, { O: INK, R: colors.object.thunder.warning }, x, y)
}
