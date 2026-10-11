import { useEffect, useRef, useState } from 'react'
import GameScreen from '../game/GameScreen'
import type { Heights } from '../game/types'
import { InputBuffer, isInputMessage } from '../lib/inputBuffer'
import { assignPlayers, MAX_PLAYERS, type AssignedPlayer } from '../lib/players'
import { getOrCreateRoomCode } from '../lib/room'
import { useRoomChannel } from '../lib/useRoomChannel'
import { EVENTS, type Phase, type PhaseMessage } from '../shared/messages'

const MIN_PLAYERS = 2

// PC側のゲーム画面。ホーム・ゲーム・リザルトの3画面をここで切り替える
// T4 時点では「スマホのボタンでPC上の四角が動く」ための仮の画面。QRコード・見た目は T5、勝敗判定・リザルトは T10
export default function HostPage() {
  const [roomCode] = useState(getOrCreateRoomCode)
  const [phase, setPhase] = useState<Phase>('lobby')
  const [round, setRound] = useState(0)
  const [heights, setHeights] = useState<Heights | null>(null)

  // 入力はゲームの1コマごとに読むので、state ではなく ref に置く（届くたびに再描画しないように）
  const inputs = useRef(new InputBuffer())

  const { channel, status, presentIds } = useRoomChannel(roomCode, undefined, (event, payload) => {
    if (event === EVENTS.input && isInputMessage(payload)) inputs.current.receive(payload)
  })

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

  // 今の画面をスマホに知らせる。途中で参加・再接続したスマホにも届くよう、参加者が変わったときも送り直す
  useEffect(() => {
    if (!channel) return
    const payload: PhaseMessage = { phase }
    void channel.send({ type: 'broadcast', event: EVENTS.phase, payload })
  }, [channel, phase, presentIds])

  const start = () => {
    inputs.current.clear()
    setHeights(null)
    setRound((r) => r + 1)
    setPhase('playing')
  }

  if (phase === 'playing') {
    return (
      <main className="flex h-full items-center justify-center p-4">
        <GameScreen
          key={round}
          players={players}
          getInputs={() => inputs.current.take()}
          onFinish={(h) => {
            setHeights(h)
            setPhase('result')
          }}
        />
      </main>
    )
  }

  const controllerUrl = `${location.origin}/controller?room=${roomCode}`
  const waiting = presentIds.length - players.length

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-5xl">Jump the highest</h1>
      {phase === 'result' && heights && (
        // 仮のリザルト：高さを並べるだけ。勝敗判定と見た目は T10
        <ul className="flex flex-wrap justify-center gap-4 text-xl">
          {players.map((p) => (
            <li key={p.playerId} style={{ color: p.color }}>
              {p.number}P：{Math.round(heights[p.playerId] ?? 0)}
            </li>
          ))}
        </ul>
      )}
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
      <button
        className="border-4 border-white px-6 py-2 text-2xl disabled:opacity-30"
        disabled={players.length < MIN_PLAYERS}
        onClick={start}
      >
        {phase === 'result' ? 'もう一度' : 'スタート'}
      </button>
    </main>
  )
}
