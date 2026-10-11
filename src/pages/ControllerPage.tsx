import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { getOrCreatePlayerId, normalizeRoomCode } from '../lib/room'
import { useRoomChannel } from '../lib/useRoomChannel'

// スマホ側のコントローラー画面（仮）。T3 時点ではルームへの参加まで。横持ち・ボタン3つの画面は T11 で作る
export default function ControllerPage() {
  const [searchParams] = useSearchParams()
  const room = normalizeRoomCode(searchParams.get('room'))
  const [playerId] = useState(getOrCreatePlayerId)
  const { status } = useRoomChannel(room, playerId)

  if (!room) {
    return (
      <main className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
        <h1 className="text-2xl">ルームが見つかりません</h1>
        <p className="text-neutral-400">PCの画面のQRコードを読み取ってください</p>
      </main>
    )
  }

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-3xl">コントローラー（仮）</h1>
      <p className="text-neutral-400">ルーム：{room}</p>
      <p className="text-xl">
        {status === 'connecting' && '接続中…'}
        {status === 'connected' && '参加しました！PCの画面を見てね'}
        {status === 'retrying' && '再接続中…（つながらないときは再読み込みしてください）'}
      </p>
    </main>
  )
}
