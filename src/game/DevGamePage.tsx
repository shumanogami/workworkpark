import { useState } from 'react'
import GameScreen from './GameScreen'
import { DEV_KEY_BINDINGS, useKeyboardInputs } from './keyboard'
import type { GamePlayer, Heights } from './types'

// 開発用：通信なしでゲーム画面だけを動かすページ（/dev/game）。野上側の画面ができる前でも確認できるようにする
const DEV_PLAYERS: GamePlayer[] = [
  { playerId: 'p1', color: '#ff5555' },
  { playerId: 'p2', color: '#55aaff' },
  { playerId: 'p3', color: '#55dd55' },
  { playerId: 'p4', color: '#ffcc33' },
]

const KEY_HELP = [
  { color: '#ff5555', keys: 'A / D / W' },
  { color: '#55aaff', keys: '← / → / ↑' },
  { color: '#55dd55', keys: 'J / L / I' },
  { color: '#ffcc33', keys: 'F / H / T' },
]

export default function DevGamePage() {
  const [round, setRound] = useState(0)
  const [heights, setHeights] = useState<Heights | null>(null)
  const getInputs = useKeyboardInputs(DEV_KEY_BINDINGS)

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4">
      <GameScreen key={round} players={DEV_PLAYERS} getInputs={getInputs} onFinish={setHeights} />
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button
          className="border-2 border-white px-4 py-1"
          onClick={(e) => {
            e.currentTarget.blur() // ボタンにフォーカスが残るとスペース等で誤って押されるため外す
            setHeights(null)
            setRound((r) => r + 1)
          }}
        >
          もう一度
        </button>
        {KEY_HELP.map((k) => (
          <span key={k.color} style={{ color: k.color }}>
            ■ {k.keys}
          </span>
        ))}
      </div>
      <p className="text-neutral-400">
        {heights ? `終了：${JSON.stringify(heights)}` : '左 / 右 / ジャンプ'}
      </p>
    </main>
  )
}
