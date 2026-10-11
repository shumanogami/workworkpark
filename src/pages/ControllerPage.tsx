import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { getOrCreatePlayerId, normalizeRoomCode } from '../lib/room'
import { useInputSender, type ButtonName } from '../lib/useInputSender'
import { useRoomChannel } from '../lib/useRoomChannel'
import { EVENTS, type Phase, type PhaseMessage } from '../shared/messages'

const PHASE_LABEL: Record<Phase, string> = {
  lobby: '参加しました！PCの画面を見てね',
  playing: 'ゲーム中！',
  result: '結果発表！PCの画面を見てね',
}

// スマホ側のコントローラー画面（仮）。T4 時点ではボタン3つを並べただけ。横持ちのレイアウト・縦向きの警告は T11 で作る
export default function ControllerPage() {
  const [searchParams] = useSearchParams()
  const room = normalizeRoomCode(searchParams.get('room'))
  const [playerId] = useState(getOrCreatePlayerId)
  const [phase, setPhase] = useState<Phase>('lobby')

  const { channel, status } = useRoomChannel(room, playerId, (event, payload) => {
    if (event === EVENTS.phase) setPhase((payload as PhaseMessage).phase)
  })
  const setButton = useInputSender(channel, playerId, phase === 'playing')

  if (!room) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl">ルームが見つかりません</h1>
        <p className="text-neutral-400">PCの画面のQRコードを読み取ってください</p>
      </main>
    )
  }

  return (
    <main className="flex h-full select-none flex-col items-center justify-center gap-6 p-4 text-center">
      <p className="text-neutral-400">ルーム：{room}</p>
      <p className="text-xl">
        {status === 'connecting' && '接続中…'}
        {status === 'connected' && PHASE_LABEL[phase]}
        {status === 'retrying' && '再接続中…（つながらないときは再読み込みしてください）'}
      </p>
      <div className="flex gap-4">
        <ControlButton name="left" label="◀" onChange={setButton} />
        <ControlButton name="right" label="▶" onChange={setButton} />
        <ControlButton name="jump" label="ジャンプ" onChange={setButton} />
      </div>
    </main>
  )
}

type ControlButtonProps = {
  name: ButtonName
  label: string
  onChange: (name: ButtonName, pressed: boolean) => void
}

// 指が触れている間だけ「押している」。複数のボタンを同時に押せるよう、pointer イベントでボタンごとに管理する
function ControlButton({ name, label, onChange }: ControlButtonProps) {
  const [pressed, setPressed] = useState(false)
  const update = (next: boolean) => {
    setPressed(next)
    onChange(name, next)
  }

  return (
    <button
      // touch-action: none でダブルタップの拡大やスクロールを防ぐ
      className={`size-24 touch-none border-4 border-white text-xl ${pressed ? 'bg-white text-black' : ''}`}
      onPointerDown={(e) => {
        // 指がボタンの外へずれても、離すまで押したままにする
        e.currentTarget.setPointerCapture(e.pointerId)
        update(true)
      }}
      onPointerUp={() => update(false)}
      onPointerCancel={() => update(false)}
      onContextMenu={(e) => e.preventDefault()} // 長押しでメニューが出ないように
    >
      {label}
    </button>
  )
}
