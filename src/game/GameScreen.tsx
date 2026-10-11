import { useEffect, useRef, useState } from 'react'
import { startBgm, stopBgm } from '../audio/bgm'
import { playBounce, playCountdownGo, playCountdownTick, playFinish, playJump } from '../audio/sfx'
import { FIXED_DT, STAGE_HEIGHT, STAGE_WIDTH } from './constants'
import { render } from './render'
import { detectEvents } from './events'
import { drawCountdown, drawFinish } from './overlay'
import {
  COUNTDOWN_SECONDS,
  countdownBeat,
  countdownLabel,
  finishView,
  highestHead,
} from './sequence'
import { createInitialState, getHeights } from './state'
import { step } from './step'
import type { GamePlayer, Heights, Inputs } from './types'

type Props = {
  players: GamePlayer[] // 参加者（野上側 → 芦田側）。最初に表示したときの値で試合を行い、途中の変更は反映しない
  getInputs: () => Inputs // 今のボタン状態（物理を1コマ進めるたびに呼ぶ）
  onFinish: (heights: Heights) => void // 10秒経って FINISH の演出が終わったら1回だけ呼ぶ（高さは10秒経った瞬間のもの）
}

// 1試合分のゲーム画面。もう一度遊ぶときは、親が key を変えて作り直す
// 流れ：カウントダウン（3・2・1・START!）→ 10秒の試合 → FINISH とバーの演出 → onFinish
export default function GameScreen({ players, getInputs, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // 参加者は最初の値で固定する。親が再描画のたびに新しい配列を渡しても、試合がやり直しにならないように
  const [initialPlayers] = useState(players)

  // 親の再描画で関数が作り直されてもゲームループを再起動しないよう、最新の関数を ref 経由で参照する
  const getInputsRef = useRef(getInputs)
  const onFinishRef = useRef(onFinish)
  useEffect(() => {
    getInputsRef.current = getInputs
    onFinishRef.current = onFinish
  })

  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    // 状態はこの effect の中だけで持つ。StrictMode で effect が2回走っても、毎回まっさらな試合から始まる
    let state = createInitialState(initialPlayers)
    // 頭上に出す名前（playerId → 名前）。参加者と同じく試合の最初の値で固定する
    // 名前を出すのはカウントダウン中だけ。試合中と FINISH の演出中は、動きや高さの比較の邪魔にならないよう消す
    const names: Record<string, string> = {}
    for (const p of initialPlayers) if (p.name) names[p.playerId] = p.name
    let lastTime: number | null = null
    let accumulator = 0
    let rafId = 0
    // 演出の経過時間（秒）。カウントダウンは描画の開始から、FINISH は10秒経った瞬間から数える
    let countdownT = 0
    let prevCountdownT: number | null = null
    let finishT: number | null = null
    let finishTarget = 0

    const frame = (time: number) => {
      // 前のコマからの経過時間。タブが裏に回って長く止まった後に一気に進まないよう上限を設ける
      const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.25)
      lastTime = time

      // カウントダウンの音：3・2・1 で「ピッ」、START! で「ポーン」と同時に BGM を流し始める
      const beat = countdownBeat(prevCountdownT, countdownT)
      if (beat === 'tick') playCountdownTick()
      if (beat === 'go') {
        playCountdownGo()
        startBgm()
      }
      prevCountdownT = countdownT
      countdownT += delta

      // カウントダウン中は物理を止める。その間に押されたボタンは読み捨てる（START! と同時に勝手に跳ばないように）
      if (prevCountdownT < COUNTDOWN_SECONDS) {
        getInputsRef.current()
        render(ctx, state, names)
        drawCountdown(ctx, countdownLabel(prevCountdownT)!)
        rafId = requestAnimationFrame(frame)
        return
      }
      accumulator += delta

      // 物理は1/60秒刻みで進める（画面が120Hzでも60Hzでも同じ結果になるように）
      // 同じコマの中で同じ音が重なって大きくならないよう、1回の描画につき1回だけ鳴らす
      let jumped = false
      let bounced = false
      while (accumulator >= FIXED_DT && !state.finished) {
        const next = step(state, getInputsRef.current(), FIXED_DT)
        const events = detectEvents(state, next)
        jumped ||= events.jumped.length > 0
        bounced ||= events.bounced.length > 0
        state = next
        accumulator -= FIXED_DT
      }
      if (jumped) playJump()
      if (bounced) playBounce()

      render(ctx, state)
      const label = countdownLabel(prevCountdownT)
      if (label) drawCountdown(ctx, label)

      // 10秒経ったら物理を止めて FINISH の演出。終わったらリザルトへ（高さは10秒経った瞬間のまま）
      if (state.finished) {
        if (finishT === null) {
          finishT = 0
          finishTarget = highestHead(state)
          stopBgm()
          playFinish()
        } else {
          finishT += delta
        }
        const view = finishView(finishT, finishTarget)
        drawFinish(ctx, view.barHeight)
        if (view.done) {
          onFinishRef.current(getHeights(state))
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
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      className="block aspect-video max-h-full max-w-full [image-rendering:pixelated]"
    />
  )
}
