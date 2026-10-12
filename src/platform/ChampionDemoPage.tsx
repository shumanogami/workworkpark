import { useState } from 'react'
import { playerColors } from '../theme'
import ChampionScreen from './ChampionScreen'
import type { MiniGamePlayer } from './types'

// 開発用：総合優勝（F7）の演出を確かめるページ（/dev/champion）
// 人数と優勝者を切り替えると、ドラムロールから演出をもう一度見られる。音は画面を一度クリックしてから鳴る

const NAMES = ['たろう', '2P', 'はなこ', '4P', 'じろう', '6P', 'さぶろう', '8P']

function samplePlayers(count: number): MiniGamePlayer[] {
  return Array.from({ length: count }, (_, i) => ({
    playerId: `p${i + 1}`,
    number: i + 1,
    color: playerColors[i],
    name: NAMES[i],
  }))
}

export default function ChampionDemoPage() {
  const [count, setCount] = useState(6)
  const [champions, setChampions] = useState(['p1'])
  const [shown, setShown] = useState(0)
  const players = samplePlayers(count)

  // key を変えて画面を作り直し、ドラムロールからもう一度見られるようにする
  const show = (nextCount: number, ids: string[]) => {
    setCount(nextCount)
    setChampions(ids)
    setShown((n) => n + 1)
  }

  const button = 'border-2 border-white px-3 py-1 text-sm'
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1">
        <ChampionScreen key={shown} players={players} champions={champions} onHome={() => setShown((n) => n + 1)} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 p-3">
        {[2, 4, 8].map((n) => (
          <button key={n} className={button} onClick={() => show(n, ['p1'])}>
            {n}人
          </button>
        ))}
        {players.map((p) => (
          <button key={p.playerId} className={button} style={{ color: p.color }} onClick={() => show(count, [p.playerId])}>
            {p.name} が優勝
          </button>
        ))}
        <button className={button} onClick={() => show(count, ['p1', 'p2'])}>
          2人が同時に優勝
        </button>
        <button className={button} onClick={() => show(count, ['p1', 'p2', 'p3'])}>
          3人が同時に優勝
        </button>
      </div>
    </div>
  )
}
