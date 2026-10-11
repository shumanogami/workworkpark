import { useState } from 'react'
import { assignPlayers, MAX_PLAYERS, type AssignedPlayer } from '../lib/players'
import { getOrCreateRoomCode } from '../lib/room'
import { useRoomChannel } from '../lib/useRoomChannel'

// PC側のゲーム画面。ホーム・ゲーム・リザルトの3画面はここで切り替える予定。
// T3 時点では、ルームを作って参加者一覧を出すところまで（QRコード・スタートボタンは T5）
export default function HostPage() {
  const [roomCode] = useState(getOrCreateRoomCode)
  const { status, presentIds } = useRoomChannel(roomCode)

  // 番号と色は前回の割り当てを引き継いで決める（PCだけが決める）
  // 接続中の一覧が変わったときだけ割り当て直す（effect を使わず描画中に更新するのが React の推奨）
  const [assigned, setAssigned] = useState<{ ids: string[]; players: AssignedPlayer[] }>({
    ids: [],
    players: [],
  })
  if (assigned.ids !== presentIds) {
    setAssigned({ ids: presentIds, players: assignPlayers(assigned.players, presentIds) })
  }
  const players = assigned.players

  const controllerUrl = `${location.origin}/controller?room=${roomCode}`
  const waiting = presentIds.length - players.length

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-5xl">Jump the highest</h1>
      <p className="text-2xl">
        ルーム：<span className="tracking-widest">{roomCode}</span>
      </p>
      <p className="break-all text-neutral-400">{controllerUrl}</p>
      <p className="text-neutral-400">
        {status === 'connecting' && 'サーバーに接続中…'}
        {status === 'retrying' && '再接続中…（つながらないときは再読み込みしてください）'}
        {status === 'connected' && `参加者 ${players.length} / ${MAX_PLAYERS} 人`}
      </p>
      <ul className="flex flex-wrap justify-center gap-4">
        {players.map((p) => (
          <li key={p.playerId} className="flex items-center gap-2 text-xl" style={{ color: p.color }}>
            <span className="inline-block size-6" style={{ backgroundColor: p.color }} />
            {p.number}P
          </li>
        ))}
      </ul>
      {waiting > 0 && <p className="text-neutral-400">満員のため {waiting} 人が待っています</p>}
    </main>
  )
}
