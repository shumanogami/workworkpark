import { useState } from 'react'
import { DEV_KEY_BINDINGS, useKeyboardInputs } from '../game/keyboard'
import { colors, playerColors } from '../theme'
import Instruction from './Instruction'
import type { MiniGame, MiniGamePlayer } from './types'

// 開発用：通信・試合の流れなしで、ミニゲーム1本の1ラウンドだけを、キーボードで遊ぶ共通のページ（各ゲームの /dev/<ゲーム名> が使う）
// キーボードで最大4人：1P A/D/W、2P ←/→/↑、3P J/L/I、4P F/H/T。F4 で全画面
const KEYS = ['A / D / W', '← / → / ↑', 'J / L / I', 'F / H / T']

export default function DevRoundPage({ game, hint }: { game: MiniGame; hint?: string }) {
  const getInputs = useKeyboardInputs(DEV_KEY_BINDINGS)
  const [count, setCount] = useState(2)
  const [round, setRound] = useState(0)
  const [winners, setWinners] = useState<string[] | null>(null)

  const players: MiniGamePlayer[] = DEV_KEY_BINDINGS.slice(0, count).map((b, i) => ({
    playerId: b.playerId,
    number: i + 1,
    color: playerColors[i],
    name: `${i + 1}P`,
  }))
  const restart = (n = count) => {
    setCount(n)
    setWinners(null)
    setRound((r) => r + 1)
  }
  const Round = game.Round

  return (
    <main className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <div className="relative">
        <Round key={`${round}-${count}`} players={players} getInputs={getInputs} onRoundEnd={setWinners} />
        {/* 本番の試合と同じひと言の指示（カウントダウンの間だけ出る） */}
        <Instruction key={`instruction-${round}-${count}`} text={game.instruction} />
        {winners && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/60">
            <p className="text-6xl" style={{ color: colors.ui.text }}>
              {winners.length === 1 ? `${players.find((p) => p.playerId === winners[0])?.name} WIN!!` : 'DRAW!!'}
            </p>
            {winners.length > 1 && <p className="text-2xl">{winners.map((id) => players.find((p) => p.playerId === id)?.name).join('・')}</p>}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <span>人数</span>
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            className={`border-2 px-3 py-1 ${n === count ? 'border-white' : 'border-neutral-600 text-neutral-400'}`}
            onClick={(e) => {
              e.currentTarget.blur() // ボタンにフォーカスが残ると、キー操作でもう一度押されてしまうため
              restart(n)
            }}
          >
            {n}人
          </button>
        ))}
        <button
          className="border-2 border-white px-3 py-1"
          onClick={(e) => {
            e.currentTarget.blur()
            restart()
          }}
        >
          最初から
        </button>
      </div>
      <p className="flex flex-wrap justify-center gap-4">
        {players.map((p, i) => (
          <span key={p.playerId} style={{ color: p.color }}>
            {p.name}（{KEYS[i]}）
          </span>
        ))}
      </p>
      <p className="text-neutral-400">{game.title}：{game.instruction}{hint ? `　${hint}` : ''}</p>
    </main>
  )
}
