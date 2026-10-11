import { useState } from 'react'
import { playerColors } from '../theme'
import { STEPS_TO_WIN } from './match'
import ResultStairs from './ResultStairs'
import type { MiniGamePlayer } from './types'

// 開発用：リザルト（階段、M8）の見た目を確かめるページ（/dev/result）
// 人数を切り替え、だれかを勝たせると、その人がぴょんと1段上がる

const NAMES = ['たろう', '2P', 'はなこ', '4P', 'じろう', '6P', 'さぶろう', '8P']

function samplePlayers(count: number): MiniGamePlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    number: i + 1,
    color: playerColors[i],
    name: NAMES[i],
  }))
}

export default function ResultDemoPage() {
  const [count, setCount] = useState(6)
  const [steps, setSteps] = useState<Record<string, number>>({})
  const [gameWinners, setGameWinners] = useState<string[]>([])
  const [shown, setShown] = useState(0)
  const players = samplePlayers(count)

  // 勝たせる（一番上を超えたら0段に戻す）。key を変えて画面を作り直し、跳ぶ動きをもう一度見られるようにする
  const win = (ids: string[]) => {
    setSteps((s) => {
      const next = { ...s }
      for (const id of ids) next[id] = ((s[id] ?? 0) % STEPS_TO_WIN) + 1
      return next
    })
    setGameWinners(ids)
    setShown((n) => n + 1)
  }

  const button = 'border-2 border-white px-3 py-1 text-sm'
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ResultStairs key={shown} gameTitle="Jump the highest" players={players} steps={steps} gameWinners={gameWinners} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 p-3">
        {[2, 4, 8].map((n) => (
          <button key={n} className={button} onClick={() => setCount(n)}>
            {n}人
          </button>
        ))}
        {players.map((p) => (
          <button key={p.playerId} className={button} style={{ color: p.color }} onClick={() => win([p.playerId])}>
            {p.name} が勝つ
          </button>
        ))}
        <button className={button} onClick={() => win(players.slice(0, 2).map((p) => p.playerId))}>
          2人が同時に勝つ
        </button>
      </div>
    </div>
  )
}
