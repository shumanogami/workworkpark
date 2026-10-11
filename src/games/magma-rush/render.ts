import { toScreen, wrapOffset } from '../../engine/scroll'
import { isAlive } from '../../engine/survival'
import { drawCharacter } from '../../game/sprite'
import { colors, fonts } from '../../theme'
import { PLAYER_SIZE, SCROLL, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { cameraTop, type MagmaState, magmaTop, magmaWave } from './step'

// マグマラッシュの描画。座標はステージ座標（960×540）のまま描く（canvas 側で 2倍に拡大する）
// 見た目のルールは DESIGN.md：1ドット＝2px、グラデーションなし、背景はキャラより暗く

const DOT = 2

// 0以上1未満の決まった値（同じ n なら毎回同じ。岩壁のでこぼこを、スクロールしても形が変わらないようにする）
function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

// 奥の峡谷の岩壁。手前の足場より遅く流して（0.5倍）、奥行きを出す
function drawCanyon(ctx: CanvasRenderingContext2D, offset: number) {
  ctx.fillStyle = colors.canyon.back
  ctx.fillRect(0, 0, STAGE_WIDTH, STAGE_HEIGHT)
  const band = 16
  const shift = wrapOffset(offset * 0.5, band)
  const first = Math.floor((offset * 0.5) / band)
  ctx.fillStyle = colors.canyon.wall
  for (let i = -1; i <= STAGE_HEIGHT / band + 1; i++) {
    const n = first - i // 上の帯ほど番号が大きい（登るほど新しい岩が出てくる）
    const y = i * band + shift
    const left = 60 + Math.round(hash(n) * 30) * DOT
    const right = 60 + Math.round(hash(n + 1000) * 30) * DOT
    ctx.fillRect(0, y, left, band)
    ctx.fillRect(STAGE_WIDTH - right, y, right, band)
  }
  // 手前の壁（ここより外へは出られない）
  ctx.fillStyle = colors.wall.main
  ctx.fillRect(0, 0, WALL_WIDTH, STAGE_HEIGHT)
  ctx.fillRect(STAGE_WIDTH - WALL_WIDTH, 0, WALL_WIDTH, STAGE_HEIGHT)
}

function drawPlatforms(ctx: CanvasRenderingContext2D, state: MagmaState) {
  for (const p of state.platforms) {
    const s = toScreen(SCROLL, state.scroll, p.x, p.y)
    if (s.y > STAGE_HEIGHT || s.y + p.height < 0) continue
    ctx.fillStyle = colors.canyon.ledge
    ctx.fillRect(s.x, s.y, p.width, p.height)
    ctx.fillStyle = colors.canyon.ledgeTop
    ctx.fillRect(s.x, s.y, p.width, DOT * 2)
    // 下側を1ドットずつ欠いて、岩のでこぼこに見せる
    ctx.fillStyle = colors.canyon.back
    for (let x = 0; x < p.width; x += DOT * 4) {
      if (hash(p.x + x) < 0.4) ctx.fillRect(s.x + x, s.y + p.height - DOT, DOT * 4, DOT)
    }
  }
}

// マグマ。表面は時間とともに4px単位で波打つ（なめらかに動かさず、コマ送りのように）
function drawMagma(ctx: CanvasRenderingContext2D, state: MagmaState) {
  const top = magmaTop(state) - cameraTop(state)
  const t = state.scroll.elapsed
  const col = DOT * 8
  for (let x = 0; x < STAGE_WIDTH; x += col) {
    const y = top + magmaWave(t, x) // 当たり判定と同じ波（-6〜+6px）
    ctx.fillStyle = colors.magma.surface
    ctx.fillRect(x, y, col, DOT * 3)
    ctx.fillStyle = colors.magma.main
    ctx.fillRect(x, y + DOT * 3, col, STAGE_HEIGHT - y)
  }
  // 深いところは暗い赤
  ctx.fillStyle = colors.magma.deep
  ctx.fillRect(0, top + 40, STAGE_WIDTH, STAGE_HEIGHT)
  // 泡（場所は決まった値、時間で点滅）
  ctx.fillStyle = colors.magma.surface
  for (let i = 0; i < 12; i++) {
    if (Math.floor(t * 3 + i * 0.7) % 3 !== 0) continue
    const x = Math.floor(hash(i) * STAGE_WIDTH / (DOT * 4)) * DOT * 4
    ctx.fillRect(x, top + 16 + Math.floor(hash(i + 50) * 20), DOT * 3, DOT * 3)
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

export type PlayerLook = { color: string; name: string }

// showNames：カウントダウン中だけ名前を出す（遊んでいる間は動きの邪魔になるため。Jump the highest と同じ）
export function render(
  ctx: CanvasRenderingContext2D,
  state: MagmaState,
  looks: Record<string, PlayerLook>,
  showNames: boolean,
) {
  drawCanyon(ctx, state.scroll.offset)
  drawPlatforms(ctx, state)
  for (const r of state.runners) {
    if (!isAlive(state.survival, r.playerId)) continue // 脱落した人は描かない
    const look = looks[r.playerId]
    const s = toScreen(SCROLL, state.scroll, r.x, r.y)
    drawCharacter(ctx, s.x, s.y, PLAYER_SIZE, look?.color ?? colors.ui.text, r.facing)
    if (showNames && look?.name) drawName(ctx, look.name, look.color, s.x, s.y)
  }
  drawMagma(ctx, state)
}
