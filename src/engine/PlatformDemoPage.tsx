import { useEffect, useRef, useState } from 'react'
import { DEV_KEY_BINDINGS, useKeyboardInputs } from '../game/keyboard'
import { type Body, patrol, type Platform, updateOnPlatforms } from './platforms'

// 開発用：足場（乗れる雲）の動きを確かめるページ（/dev/platforms）
// 雲の見た目はまだ決まっていないので、仮の白い形で描く。キャラの動き（重力・ジャンプ）もこのページだけの仮のもの

const WIDTH = 960
const HEIGHT = 540
const GRAVITY = 2000
const JUMP_SPEED = 750
const MOVE_SPEED = 260

// 動かない足場。地面も「幅の広い足場」として扱う
const FIXED: Platform[] = [
  { id: 'ground', x: 0, y: HEIGHT - 40, width: WIDTH, height: 40 },
  { id: 'cloud-a', x: 120, y: 400, width: 140, height: 24 },
  { id: 'cloud-b', x: 380, y: 320, width: 140, height: 24 },
  { id: 'cloud-c', x: 700, y: 240, width: 140, height: 24 },
  { id: 'cloud-d', x: 420, y: 150, width: 120, height: 24 },
]

// 時間 t のときの動く足場（横に往復する雲と、上下に往復する雲）
function movingPlatforms(t: number): Platform[] {
  return [
    { id: 'cloud-side', x: patrol(80, 300, 80, t), y: 230, width: 120, height: 24 },
    { id: 'cloud-lift', x: 800, y: patrol(430, 120, 60, t), width: 100, height: 24 },
  ]
}

function platformsAt(t: number): Platform[] {
  return [...FIXED, ...movingPlatforms(t)]
}

const START: Body = { x: 40, y: HEIGHT - 80, width: 40, height: 40, vx: 0, vy: 0, standingOn: 'ground' }

export default function PlatformDemoPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const getInputs = useKeyboardInputs(DEV_KEY_BINDINGS)
  const [round, setRound] = useState(0)
  const [standing, setStanding] = useState<string | null>('ground')

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let t = 0
    let body = START
    let jumpHeld = false
    let last: number | null = null
    let rafId = 0

    const frame = (time: number) => {
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 1 / 30)
      last = time
      const prevPlatforms = platformsAt(t)
      t += dt
      const nextPlatforms = platformsAt(t)

      // キャラの動き（仮）：左右、ジャンプ（押した瞬間だけ・足場に乗っているときだけ）、重力
      const input = getInputs()['p1']
      const dir = (input?.right ? 1 : 0) - (input?.left ? 1 : 0)
      let vy = body.vy + GRAVITY * dt
      const pressed = !!input?.jump && !jumpHeld
      jumpHeld = !!input?.jump
      if (pressed && body.standingOn) vy = -JUMP_SPEED
      const vx = dir * MOVE_SPEED
      const moved: Body = {
        ...body,
        vx,
        vy,
        x: Math.min(Math.max(body.x + vx * dt, 0), WIDTH - body.width),
        y: body.y + vy * dt,
      }

      // 足場に乗る・運ばれる・降りる（部品の処理）
      body = updateOnPlatforms(body, moved, prevPlatforms, nextPlatforms)
      // 画面の下に落ちたら、最初の位置に戻す（地面があるので普通は落ちない）
      if (body.y > HEIGHT) body = START
      setStanding(body.standingOn)

      draw(ctx, nextPlatforms, body)
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [getInputs, round])

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-video max-h-full max-w-full" />
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span>A / D：左右　W：ジャンプ</span>
        <button
          className="border-2 border-white px-3 py-1"
          onClick={(e) => {
            e.currentTarget.blur()
            setRound((r) => r + 1)
          }}
        >
          最初から
        </button>
        <span className="text-neutral-400">乗っている足場：{standing ?? 'なし（空中）'}</span>
      </div>
    </main>
  )
}

function draw(ctx: CanvasRenderingContext2D, platforms: Platform[], body: Body) {
  ctx.fillStyle = '#7ec8f0'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  for (const p of platforms) {
    if (p.id === 'ground') {
      ctx.fillStyle = '#7a5a3a'
      ctx.fillRect(p.x, p.y, p.width, p.height)
      ctx.fillStyle = '#5cbf4a'
      ctx.fillRect(p.x, p.y, p.width, 8)
      continue
    }
    // 仮の雲：角の丸い白い板。乗れる面（上面）を分かりやすくするため、上に細い線を引く
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.roundRect(p.x, p.y, p.width, p.height, p.height / 2)
    ctx.fill()
    ctx.fillStyle = '#c9e6f5'
    ctx.fillRect(p.x + 8, p.y + p.height - 6, p.width - 16, 4)
    if (p.id === 'cloud-side' || p.id === 'cloud-lift') {
      ctx.fillStyle = '#5a7a9a'
      ctx.font = '14px "DotGothic16", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(p.id === 'cloud-side' ? '⇔' : '⇕', p.x + p.width / 2, p.y + p.height / 2 + 5)
    }
  }

  // 仮のキャラ：赤い四角（乗っているときは目が開き、空中では細目）
  ctx.fillStyle = '#ff5555'
  ctx.fillRect(body.x, body.y, body.width, body.height)
  ctx.fillStyle = '#1c1c28'
  const eyeH = body.standingOn ? 8 : 3
  ctx.fillRect(body.x + 10, body.y + 12, 6, eyeH)
  ctx.fillRect(body.x + 24, body.y + 12, 6, eyeH)
}
