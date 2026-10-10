import { useState } from 'react'
import GameScreen from './GameScreen'
import type { GamePlayer, Heights } from './types'

// 開発用：通信なしでゲーム画面だけを動かすページ（/dev/game）。野上側の画面ができる前でも確認できるようにする
const DEV_PLAYERS: GamePlayer[] = [
  { playerId: 'p1', color: '#ff5555' },
  { playerId: 'p2', color: '#55aaff' },
  { playerId: 'p3', color: '#55dd55' },
  { playerId: 'p4', color: '#ffcc33' },
]

// 入力なし（T7 でキーボード操作に置き換える）。毎回新しい関数を作らないよう外に置く
const noInputs = () => ({})

export default function DevGamePage() {
  const [round, setRound] = useState(0)
  const [heights, setHeights] = useState<Heights | null>(null)

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <GameScreen key={round} players={DEV_PLAYERS} getInputs={noInputs} onFinish={setHeights} />
      <div className="flex items-center gap-4">
        <button
          className="border-2 border-white px-4 py-1"
          onClick={() => {
            setHeights(null)
            setRound((r) => r + 1)
          }}
        >
          もう一度
        </button>
        <span className="text-neutral-400">
          {heights ? `終了：${JSON.stringify(heights)}` : 'プレイ中…'}
        </span>
      </div>
    </main>
  )
}
