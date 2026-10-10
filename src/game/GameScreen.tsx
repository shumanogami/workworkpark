import { useEffect, useRef } from 'react'
import { FIXED_DT, STAGE_HEIGHT, STAGE_WIDTH } from './constants'
import { render } from './render'
import { createInitialState, getHeights } from './state'
import { step } from './step'
import type { GamePlayer, Heights, Inputs } from './types'

type Props = {
  players: GamePlayer[] // 参加者（野上側 → 芦田側）
  getInputs: () => Inputs // 今のボタン状態（物理を1コマ進めるたびに呼ぶ）
  onFinish: (heights: Heights) => void // 10秒経ったら1回だけ呼ぶ
}

// 1試合分のゲーム画面。もう一度遊ぶときは、親が key を変えて作り直す
export default function GameScreen({ players, getInputs, onFinish }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

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
    let state = createInitialState(players)
    let lastTime: number | null = null
    let accumulator = 0
    let rafId = 0

    const frame = (time: number) => {
      // 前のコマからの経過時間。タブが裏に回って長く止まった後に一気に進まないよう上限を設ける
      const delta = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, 0.25)
      lastTime = time
      accumulator += delta

      // 物理は1/60秒刻みで進める（画面が120Hzでも60Hzでも同じ結果になるように）
      while (accumulator >= FIXED_DT && !state.finished) {
        state = step(state, getInputsRef.current(), FIXED_DT)
        accumulator -= FIXED_DT
      }

      render(ctx, state)

      if (state.finished) {
        onFinishRef.current(getHeights(state))
        return // 次のコマを予約しない＝ループ終了
      }
      rafId = requestAnimationFrame(frame)
    }
    rafId = requestAnimationFrame(frame)

    // 画面を離れたら必ずループを止める（止め忘れると二重に動く）
    return () => cancelAnimationFrame(rafId)
  }, [players])

  return (
    <canvas
      ref={canvasRef}
      width={STAGE_WIDTH}
      height={STAGE_HEIGHT}
      className="block aspect-video max-h-full max-w-full [image-rendering:pixelated]"
    />
  )
}
