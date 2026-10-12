import { useState } from 'react'
import { playerColors } from '../theme'
import { WINS_TO_CLEAR } from './match'
import MiniResult from './MiniResult'
import type { MiniGamePlayer } from './types'

// 開発用：ミニリザルト（M7）の見た目を確かめるページ（/dev/mini-result）
// 人数を切り替え、だれかを勝たせると、その人のライトが点滅して点く

const NAMES = ['たろう', '2P', 'はなこ', '4P', 'じろう', '6P', 'さぶろう', '8P']

function samplePlayers(count: number): MiniGamePlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    number: i + 1,
    color: playerColors[i],
    name: NAMES[i],
  }))
}

export default function MiniResultDemoPage() {
  const [count, setCount] = useState(4)
  const [wins, setWins] = useState<Record<string, number>>({})
  const [roundWinners, setRoundWinners] = useState<string[]>([])
  const [round, setRound] = useState(1)
  const players = samplePlayers(count)

  // 勝たせる（2勝を超えたら0に戻す）。key を変えて画面を作り直し、点滅をもう一度見られるようにする
  const win = (ids: string[]) => {
    setWins((w) => {
      const next = { ...w }
      for (const id of ids) next[id] = ((w[id] ?? 0) % WINS_TO_CLEAR) + 1
      return next
    })
    setRoundWinners(ids)
    setRound((r) => r + 1)
  }

  const button = 'border-2 border-white px-3 py-1 text-sm'
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <MiniResult
          key={round}
          gameTitle="Jump the highest"
          roundNumber={round}
          players={players}
          wins={wins}
          roundWinners={roundWinners}
        />
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
          2人で引き分け
        </button>
        <button className={button} onClick={() => win(players.map((p) => p.playerId))}>
          全員引き分け
        </button>
      </div>
    </div>
  )
}
