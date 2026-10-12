import { useEffect, useRef, useState } from 'react'
import { startBgm, stopBgm } from '../../audio/bgm'
import { playBounce, playCountdownGo, playCountdownTick, playFinish, playJump, playMagmaDeath } from '../../audio/sfx'
import { drawCountdown, drawFinish } from '../../game/overlay'
import { COUNTDOWN_SECONDS, countdownBeat, countdownLabel } from '../../game/sequence'
import type { RoundProps } from '../../platform/types'
import { FIXED_DT, RENDER_SCALE, STAGE_HEIGHT, STAGE_WIDTH } from './constants'
import { render, type PlayerLook } from './render'
import { createMagmaState, step } from './step'

// FINISH を出しておく秒数。終わったらミニリザルトへ
const FINISH_SECONDS = 2

// 全画面にするキー（Jump the highest と同じ F4。Esc は全画面を抜けるキーなので使えない）
const FULLSCREEN_KEY = 'F4'

// マグマラッシュの1ラウンド分の画面。ミニゲームの共通の形（src/platform/types.ts）に合わせる
// 流れ：カウントダウン（3・2・1・START!）→ マグマが上がり始める → 最後の1人になったら FINISH → onRoundEnd(勝った人)
// ひと言の指示（ルール説明）は試合の進行（HostPage）がラウンドの始めに3秒出すので、ここでは出さない
export default function MagmaRushRound({ players, getInputs, onRoundEnd }: RoundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // 参加者は最初の値で固定する（親の再描画でラウンドがやり直しにならないように）
  const [initialPlayers] = useState(players)

  const getInputsRef = useRef(getInputs)
  const onRoundEndRef = useRef(onRoundEnd)
  useEffect(() => {
    getInputsRef.current = getInputs
    onRoundEndRef.current = onRoundEnd
  })

  const isFullscreen = useFullscreen()

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.setTransform(RENDER_SCALE, 0, 0, RENDER_SCALE, 0, 0)

    // 足場の並びはラウンドごとに変える。状態は effect の中だけで持つ（StrictMode で2回走っても、毎回まっさらから）
    let state = createMagmaState(
      initialPlayers.map((p) => p.playerId),
      Math.floor(Math.random() * 2 ** 31),
    )
    const looks: Record<string, PlayerLook> = {}
    for (const p of initialPlayers) looks[p.playerId] = { color: p.color, name: p.name }

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

      // カウントダウン中はマグマもキャラも止める。その間に押されたボタンは読み捨てる
      if (prevCountdownT < COUNTDOWN_SECONDS) {
        getInputsRef.current()
        render(ctx, state, looks, true)
        drawCountdown(ctx, countdownLabel(prevCountdownT)!)
        rafId = requestAnimationFrame(frame)
        return
      }

      accumulator += delta
      let jumped = false
      let bounced = false
      let burned = false
      while (accumulator >= FIXED_DT && !state.finished) {
        const next = step(state, getInputsRef.current(), FIXED_DT)
        jumped ||= next.runners.some((r, i) => r.vy < 0 && state.runners[i].vy >= 0 && state.runners[i].standingOn !== null)
        // 弾かれた瞬間（弾かれて操作できない時間が始まった）
        bounced ||= next.runners.some((r, i) => r.stunTime > 0 && state.runners[i].stunTime === 0)
        // マグマに飲まれた瞬間
        burned ||= next.survival.eliminated.length > state.survival.eliminated.length
        state = next
        accumulator -= FIXED_DT
      }
      if (jumped) playJump()
      if (bounced) playBounce()
      if (burned) playMagmaDeath()

      render(ctx, state, looks, false)
      const label = countdownLabel(prevCountdownT)
      if (label) drawCountdown(ctx, label)

      if (state.finished) {
        if (finishT === null) {
          finishT = 0
          stopBgm()
          playFinish()
        } else {
          finishT += delta
        }
        drawFinish(ctx, null)
        if (finishT >= FINISH_SECONDS) {
          onRoundEndRef.current(state.winners)
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
      width={STAGE_WIDTH * RENDER_SCALE}
      height={STAGE_HEIGHT * RENDER_SCALE}
      // 全画面のときは 16:9 のまま画面いっぱいに、ドットをぼかさずに広げる（Jump the highest と同じ）
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 block h-full w-full bg-black object-contain [image-rendering:pixelated]'
          : 'block h-[540px] max-h-full w-[960px] max-w-full object-contain'
      }
    />
  )
}

// 全画面表示かどうか。F4 で全画面にする（ブラウザはキー入力の直後にしか全画面を許さないため）
function useFullscreen(): boolean {
  const [isFullscreen, setIsFullscreen] = useState(() => document.fullscreenElement !== null)
  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement !== null)
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== FULLSCREEN_KEY || document.fullscreenElement) return
      e.preventDefault()
      // ページ全体を全画面にする（canvas だけだと、ミニリザルトへ切り替わったときに解除されるため）
      document.documentElement.requestFullscreen().catch(() => {})
    }
    document.addEventListener('fullscreenchange', onChange)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])
  return isFullscreen
}
