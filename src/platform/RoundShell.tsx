import { type ReactNode, useEffect, useRef, useState } from 'react'
import { playBounce, playCountdownGo, playCountdownTick, playFinish, playJump } from '../audio/sfx'
import { startBgm, stopBgm } from '../audio/bgm'
import { drawCountdown, drawFinish } from '../game/overlay'
import { COUNTDOWN_SECONDS, countdownBeat, countdownLabel } from '../game/sequence'
import type { MiniGamePlayer, RoundInputs, RoundProps } from './types'

// ミニゲーム1ラウンド分の「共通の枠」。どのミニゲームもこれに載せると、同じ流れ・同じ見た目になる
// 流れ：カウントダウン（3・2・1・START!）→ ゲーム → 決着で FINISH（2秒）→ onRoundEnd(勝った人)
// 枠が受け持つこと：canvas（1920×1080）・固定1/60秒の進め方・カウントダウン・FINISH・BGM・効果音・F4で全画面・ループの止め方
// ゲームが受け持つこと：状態の作り方・1コマの進め方（純粋な関数）・絵の描き方・決着と勝者・鳴らす音の判断
// ひと言の指示（「生き残れ！」など）は試合の進行（HostPage）が先に3秒出すので、枠では出さない

export const ROUND_WIDTH = 960 // ゲームの座標系（全ミニゲーム共通）。canvas は ROUND_SCALE 倍で描く
export const ROUND_HEIGHT = 540
export const ROUND_SCALE = 2
export const ROUND_DT = 1 / 60 // 物理は1/60秒刻み（端末の画面の速さで結果が変わらないように）

const FINISH_SECONDS = 2 // FINISH を出しておく秒数
const FULLSCREEN_KEY = 'F4' // Esc は全画面を抜けるキーなので使えない（Jump the highest と同じ）

// 1コマで起きた出来事の名前。games が events() で返し、枠が sfx の表で音に変える
export type RoundEvent = string

export type RoundGame<S> = {
  create: (players: MiniGamePlayer[]) => S // ラウンドごとに呼ばれる（足場やコインの並びを毎回変えてよい）
  step: (state: S, inputs: RoundInputs, dt: number) => S
  // 1コマ描く。frozen は「カウントダウン中」（止まっている画面）
  render: (ctx: CanvasRenderingContext2D, state: S, players: MiniGamePlayer[], frozen: boolean) => void
  isFinished: (state: S) => boolean
  winners: (state: S) => string[] // isFinished のあとに呼ばれる。複数なら引き分け
  events?: (prev: S, next: S) => RoundEvent[] // 1コマ進めるたびに呼ばれる。同じコマ内の同じ出来事は1回だけ鳴らす
  // 出来事 → 音。'jump'・'bounce' は初めから入っている。ゲームごとに足せる
  sfx?: Record<RoundEvent, () => void>
}

const DEFAULT_SFX: Record<RoundEvent, () => void> = { jump: playJump, bounce: playBounce }

type Props<S> = RoundProps & { game: RoundGame<S>; children?: ReactNode }

export default function RoundShell<S>({ game, players, getInputs, onRoundEnd }: Props<S>) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 参加者は最初の値で固定する（親の再描画でラウンドがやり直しにならないように）
  const [initialPlayers] = useState(players)
  const gameRef = useRef(game)
  const getInputsRef = useRef(getInputs)
  const onRoundEndRef = useRef(onRoundEnd)
  useEffect(() => {
    gameRef.current = game
    getInputsRef.current = getInputs
    onRoundEndRef.current = onRoundEnd
  })

  useFullscreenKey()

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.setTransform(ROUND_SCALE, 0, 0, ROUND_SCALE, 0, 0)
    const g = gameRef.current
    const sfx = { ...DEFAULT_SFX, ...g.sfx }

    // 状態は effect の中だけで持つ（StrictMode で2回走っても、毎回まっさらから）
    let state = g.create(initialPlayers)
    let lastTime: number | null = null
    let accumulator = 0
    let countdownT = 0
    let prevCountdownT: number | null = null
    let finishT: number | null = null
    let rafId = 0

    const frame = (time: number) => {
      const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.25)
      lastTime = time

      const beat = countdownBeat(prevCountdownT, countdownT)
      if (beat === 'tick') playCountdownTick()
      if (beat === 'go') {
        playCountdownGo()
        startBgm()
      }
      prevCountdownT = countdownT
      countdownT += delta

      // カウントダウン中は止めておく。その間に押されたボタンは読み捨てる
      if (prevCountdownT < COUNTDOWN_SECONDS) {
        getInputsRef.current()
        g.render(ctx, state, initialPlayers, true)
        drawCountdown(ctx, countdownLabel(prevCountdownT)!)
        rafId = requestAnimationFrame(frame)
        return
      }

      accumulator += delta
      const happened = new Set<RoundEvent>()
      while (accumulator >= ROUND_DT && !g.isFinished(state)) {
        const next = g.step(state, getInputsRef.current(), ROUND_DT)
        for (const e of g.events?.(state, next) ?? []) happened.add(e)
        state = next
        accumulator -= ROUND_DT
      }
      for (const e of happened) sfx[e]?.()

      g.render(ctx, state, initialPlayers, false)
      const label = countdownLabel(prevCountdownT)
      if (label) drawCountdown(ctx, label)

      if (g.isFinished(state)) {
        if (finishT === null) {
          finishT = 0
          stopBgm()
          playFinish()
        } else {
          finishT += delta
        }
        drawFinish(ctx, null)
        if (finishT >= FINISH_SECONDS) {
          onRoundEndRef.current(g.winners(state))
          return // 次のコマを予約しない＝ループ終了
        }
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    // 画面を離れたら必ずループを止める（止め忘れると二重に動く）
    return () => {
      cancelAnimationFrame(rafId)
      stopBgm()
    }
  }, [initialPlayers])

  return (
    <canvas
      ref={canvasRef}
      width={ROUND_WIDTH * ROUND_SCALE}
      height={ROUND_HEIGHT * ROUND_SCALE}
      // 全画面のときは 16:9 のまま画面いっぱいに、ドットをぼかさずに広げる（Jump the highest と同じ）
      className={
        'fixed inset-0 z-50 block h-full w-full bg-black object-contain [image-rendering:pixelated]'
      }
    />
  )
}

// F4 で全画面にする（ブラウザはキー入力の直後にしか全画面を許さないため）。canvas は常に画面いっぱいなので、状態は持たない
function useFullscreenKey() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== FULLSCREEN_KEY || document.fullscreenElement) return
      e.preventDefault()
      // ページ全体を全画面にする（canvas だけだと、ミニリザルトへ切り替わったときに解除されるため）
      document.documentElement.requestFullscreen().catch(() => {})
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
