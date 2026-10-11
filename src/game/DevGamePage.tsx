import { useState } from 'react'
import SoundToggle from '../audio/SoundToggle'
import {
  playBounce,
  playCountdownGo,
  playCountdownTick,
  playDecide,
  playFinish,
  playJump,
} from '../audio/sfx'
import GameScreen from './GameScreen'
import { DEV_KEY_BINDINGS, useKeyboardInputs } from './keyboard'
import type { GamePlayer, Heights } from './types'

// 開発用：通信なしでゲーム画面だけを動かすページ（/dev/game）。野上側の画面ができる前でも確認できるようにする
const DEV_PLAYERS: GamePlayer[] = [
  { playerId: 'p1', color: '#ff5555', name: '1P' },
  { playerId: 'p2', color: '#55aaff', name: 'しゅうま' },
  { playerId: 'p3', color: '#55dd55', name: '3P' },
  { playerId: 'p4', color: '#ffcc33', name: 'ABCDEFGH' },
]

const KEY_HELP = [
  { color: '#ff5555', keys: 'A / D / W' },
  { color: '#55aaff', keys: '← / → / ↑' },
  { color: '#55dd55', keys: 'J / L / I' },
  { color: '#ffcc33', keys: 'F / H / T' },
]

const SOUND_SAMPLES = [
  { label: 'ジャンプ', play: playJump },
  { label: '弾かれた', play: playBounce },
  { label: '決定', play: playDecide },
  { label: 'カウント', play: playCountdownTick },
  { label: 'スタート', play: playCountdownGo },
  { label: '終了', play: playFinish },
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
        <SoundToggle />
      </div>
      {/* 開発用：効果音を1つずつ聞いて確かめる（カウントダウン・決定音は T17・T15 で使う予定） */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-neutral-400">効果音を試す：</span>
        {SOUND_SAMPLES.map((s) => (
          <button
            key={s.label}
            className="border border-neutral-500 px-2"
            onClick={(e) => {
              e.currentTarget.blur()
              s.play()
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-neutral-400">
        {heights ? `終了：${JSON.stringify(heights)}` : '左 / 右 / ジャンプ'}
      </p>
    </main>
  )
}
