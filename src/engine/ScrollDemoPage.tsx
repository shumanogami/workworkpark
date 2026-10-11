import { useEffect, useRef, useState } from 'react'
import {
  createScroll,
  DEFAULT_HORIZONTAL,
  DEFAULT_VERTICAL,
  type ScrollConfig,
  type ScrollState,
  stepScroll,
  toScreen,
  topSpeed,
  visibleRange,
  wrapOffset,
} from './scroll'

// 開発用：スクロールの動きを確かめるページ（/dev/scroll）。横・縦の切り替え、向きの反転、最初からやり直しができる
// 本番のゲームでは、ゲームごとにキャラや足場をワールド座標で置き、toScreen で画面に写して描く

const WIDTH = 960
const HEIGHT = 540
const GRID = 80 // 目盛りの間隔（ワールド座標のピクセル）
const MARKER = 240 // 番号付きの柱の間隔

function configFor(axis: 'horizontal' | 'vertical', direction: 1 | -1): ScrollConfig {
  return { ...(axis === 'horizontal' ? DEFAULT_HORIZONTAL : DEFAULT_VERTICAL), direction }
}

export default function ScrollDemoPage() {
  const [axis, setAxis] = useState<'horizontal' | 'vertical'>('horizontal')
  const [direction, setDirection] = useState<1 | -1>(1)
  const [round, setRound] = useState(0)
  const [hud, setHud] = useState<ScrollState>(createScroll(DEFAULT_HORIZONTAL))
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const config = configFor(axis, direction)

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    // 設定は axis・direction から作る（その2つか round が変わったら、最初からやり直す）
    const config = configFor(axis, direction)
    let state = createScroll(config)
    let last: number | null = null
    let rafId = 0
    let hudTimer = 0

    const frame = (time: number) => {
      const dt = last === null ? 0 : Math.min((time - last) / 1000, 0.25)
      last = time
      state = stepScroll(state, config, dt)
      draw(ctx, config, state)
      // 数値の表示は1秒に10回だけ更新する（毎コマ更新すると React の再描画が多くなりすぎるため）
      hudTimer += dt
      if (hudTimer >= 0.1) {
        hudTimer = 0
        setHud(state)
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [axis, direction, round])

  const button = 'border-2 border-white px-3 py-1'
  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="block aspect-video max-h-full max-w-full" />
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className={`${button} ${axis === 'horizontal' ? 'bg-white text-black' : ''}`} onClick={() => setAxis('horizontal')}>
          横スクロール
        </button>
        <button className={`${button} ${axis === 'vertical' ? 'bg-white text-black' : ''}`} onClick={() => setAxis('vertical')}>
          縦スクロール
        </button>
        <button className={button} onClick={() => setDirection((d) => (d === 1 ? -1 : 1))}>
          向きを反転（今：{axis === 'horizontal' ? (direction === 1 ? '右へ' : '左へ') : direction === 1 ? '上へ' : '下へ'}）
        </button>
        <button className={button} onClick={() => setRound((r) => r + 1)}>
          最初から
        </button>
      </div>
      <p className="text-neutral-300">
        経過 {hud.elapsed.toFixed(1)} 秒 ／ 速さ {Math.round(hud.speed)} px/秒（最高 {topSpeed(config)}）／ 進んだ距離{' '}
        {Math.round(hud.offset)} px
      </p>
    </main>
  )
}

// ワールドの目盛りと番号付きの柱を描く。画面に入っている範囲だけを描く
function draw(ctx: CanvasRenderingContext2D, config: ScrollConfig, state: ScrollState) {
  const horizontal = config.axis === 'horizontal'
  ctx.fillStyle = '#1c2a3a'
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  // くり返しの縞模様（遠くの背景）。手前の目盛りの半分の速さで動かし、奥行きを出す
  const stripe = 160
  const far = wrapOffset(state.offset * config.direction * 0.5, stripe)
  ctx.fillStyle = '#22344a'
  for (let i = -1; i <= (horizontal ? WIDTH : HEIGHT) / stripe + 1; i++) {
    const p = i * stripe + (horizontal ? -far : far)
    if (horizontal) ctx.fillRect(p, 0, stripe / 2, HEIGHT)
    else ctx.fillRect(0, p, WIDTH, stripe / 2)
  }

  // 目盛り（ワールド座標で GRID ごと）
  const range = visibleRange(config, state, horizontal ? WIDTH : HEIGHT)
  ctx.strokeStyle = '#3d5a7a'
  ctx.lineWidth = 1
  for (let w = Math.floor(range.from / GRID) * GRID; w <= range.to; w += GRID) {
    const s = horizontal ? toScreen(config, state, w, 0).x : toScreen(config, state, 0, w).y
    ctx.beginPath()
    if (horizontal) {
      ctx.moveTo(s, 0)
      ctx.lineTo(s, HEIGHT)
    } else {
      ctx.moveTo(0, s)
      ctx.lineTo(WIDTH, s)
    }
    ctx.stroke()
  }

  // 番号付きの柱（ワールド座標で MARKER ごと）。番号を見れば、どれだけ進んだか分かる
  ctx.font = '24px "DotGothic16", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let w = Math.floor(range.from / MARKER) * MARKER; w <= range.to; w += MARKER) {
    const s = horizontal ? toScreen(config, state, w, 0).x : toScreen(config, state, 0, w).y
    ctx.fillStyle = '#ffcc33'
    if (horizontal) ctx.fillRect(s - 6, HEIGHT - 120, 12, 120)
    else ctx.fillRect(WIDTH - 120, s - 6, 120, 12)
    ctx.fillStyle = '#ffffff'
    if (horizontal) ctx.fillText(String(w), s, HEIGHT - 140)
    else ctx.fillText(String(-w), WIDTH - 180, s)
  }

  // 画面の真ん中の目印（カメラの位置）
  ctx.fillStyle = '#ff5555'
  ctx.fillRect(WIDTH / 2 - 10, HEIGHT / 2 - 10, 20, 20)
}
