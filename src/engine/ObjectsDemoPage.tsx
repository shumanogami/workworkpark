import { useEffect, useRef } from 'react'
import { drawCharacter } from '../game/sprite'
import { colors, fonts, playerColors } from '../theme'
import {
  boltHitRect,
  CLOUD_SIZE,
  drawBird,
  drawCoin,
  drawPoisonMushroom,
  drawThunder,
  drawThunderCloud,
  hitRect,
  OBJECT_SIZE,
  THUNDER_STRIKE_SECONDS,
  THUNDER_WARNING_SECONDS,
  thunderPhase,
} from './objects'

// 開発用（/dev/objects）：ミニゲームの物（コイン・毒キノコ・鳥・雷）の見た目を確認する見本帳
// 上：キャラ（40px）と並べた実寸／中：4倍に拡大した絵（当たり判定を赤い枠で表示）／下：動き（回転・羽ばたき・雷の予告と落下）
const W = 960
const H = 540
const SCALE = 2
const CYCLE = 3 // 雷のくり返し（秒）：休み → 予告 → 落下

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 12) {
  ctx.font = `${size}px ${fonts.dot}`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillStyle = colors.ink.main
  ctx.fillText(text, x, y)
}

function frame(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.strokeStyle = '#f83800'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1)
}

function draw(ctx: CanvasRenderingContext2D, t: number) {
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)
  ctx.fillStyle = colors.sky.main
  ctx.fillRect(0, 0, W, H)

  // ---- 上：実寸（キャラと並べる）----
  label(ctx, '実寸（キャラ 40px と並べた大きさ）　赤い枠＝当たり判定', 16, 10)
  drawCharacter(ctx, 30, 40, 40, playerColors[0])
  drawCoin(ctx, 110, 48, t)
  drawPoisonMushroom(ctx, 170, 46, t)
  drawBird(ctx, 240, 42, t, -1)
  drawBird(ctx, 310, 42, t, 1)
  for (const [kind, x, y] of [['coin', 110, 48], ['poison', 170, 46], ['bird', 240, 42], ['bird', 310, 42]] as const) {
    const r = hitRect(kind, x, y)
    frame(ctx, r.x, r.y, r.width, r.height)
  }
  label(ctx, 'キャラ　　コイン　毒キノコ　鳥（左向き）　鳥（右向き）', 28, 80, 10)

  // ---- 中：3倍に拡大 ----
  label(ctx, '3倍に拡大', 16, 104)
  ctx.save()
  ctx.scale(3, 3)
  for (let i = 0; i < 4; i++) drawCoin(ctx, 6 + i * 28, 36, i * 0.15) // 回転の4コマ
  drawPoisonMushroom(ctx, 130, 36, 0)
  drawBird(ctx, 175, 36, 0, -1) // 羽が上
  drawBird(ctx, 225, 36, 0.2, -1) // 羽が下
  ctx.restore()
  drawThunderCloud(ctx, 780, 140, 'idle')
  drawThunderCloud(ctx, 870, 140, 'warning')
  label(ctx, 'コイン（回転4コマ）', 16, 198, 10)
  label(ctx, '毒キノコ', 396, 198, 10)
  label(ctx, '鳥（羽 上／下）', 530, 198, 10)
  label(ctx, '雷雲（休み／光る）', 740, 198, 10)

  // ---- 下：動き ----
  label(ctx, '動き', 16, 216)
  // コインの列（回転）。毒キノコの列（揺れ）
  for (let i = 0; i < 6; i++) drawCoin(ctx, 20 + i * 34, 240, t + i * 0.1)
  for (let i = 0; i < 3; i++) drawPoisonMushroom(ctx, 250 + i * 40, 238, t + i * 0.1)
  // 鳥：左右に飛ぶ
  const bx = ((t * 120) % 1000) - 40
  drawBird(ctx, W - bx, 234, t, -1)
  drawBird(ctx, bx - 100, 274, t, 1)

  // 雷：雲の下に柱。休み → 予告（0.8秒・当たらない）→ 落下（0.3秒・当たる）

  ctx.fillStyle = colors.cloud.main
  ctx.fillRect(0, 470, W, 8)
  const local = t % CYCLE
  const started = CYCLE - THUNDER_WARNING_SECONDS - THUNDER_STRIKE_SECONDS - 0.4 // くり返しの中での開始位置
  const phase = thunderPhase(started, local)
  const gx = 120
  drawThunderCloud(ctx, gx + 12, 300 - CLOUD_SIZE.height - 2, phase)
  drawThunder(ctx, gx, 300, 470, phase, t)
  drawCharacter(ctx, gx - 60, 430, 40, playerColors[1])
  drawCharacter(ctx, gx + 40, 430, 40, playerColors[2])
  if (phase === 'strike') {
    const r = boltHitRect(gx, 300, 470)
    frame(ctx, r.x, r.y, r.width, r.height)
  }
  label(ctx, `雷：${phase === 'idle' ? '休み' : phase === 'warning' ? '予告（よけられる）' : '落下（当たる）'}`, 20, 484, 12)
  label(ctx, `柱の幅 ${OBJECT_SIZE.bolt.width}px（当たり ${OBJECT_SIZE.bolt.hit.width}px）`, 20, 504, 10)

}

export default function ObjectsDemoPage() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    let raf = 0
    const start = performance.now()
    // URL に ?t=2.4 を付けると、その時刻の止まった絵になる（雷の落下の瞬間などをじっくり見る用）
    const fixed = new URLSearchParams(location.search).get('t')
    const loop = (now: number) => {
      draw(ctx, fixed !== null ? Number(fixed) : (now - start) / 1000)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <main className="flex h-full items-center justify-center bg-neutral-900 p-2">
      <canvas ref={ref} width={W * SCALE} height={H * SCALE} className="h-[540px] max-h-full w-[960px] max-w-full [image-rendering:pixelated]" />
    </main>
  )
}
