import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import CharacterIcon from '../game/CharacterIcon'
import GameScreen from '../game/GameScreen'
import type { Heights } from '../game/types'
import { InputBuffer, isInputMessage } from '../lib/inputBuffer'
import { judgeWinners } from '../lib/judge'
import { assignPlayers, MAX_PLAYERS, type AssignedPlayer } from '../lib/players'
import { getOrCreateRoomCode } from '../lib/room'
import { useRoomChannel } from '../lib/useRoomChannel'
import { EVENTS, type Phase, type PhaseMessage } from '../shared/messages'

const MIN_PLAYERS = 2

// PC側のゲーム画面。ホーム・ゲーム・リザルトの3画面をここで切り替える
// ゲーム画面・リザルト画面はラフ画（2026-10-11 野上）に合わせている
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

  // 試合に出た人。試合中・リザルト中に誰かが抜けても、結果の表示が崩れないよう開始時の一覧を残す
  const [matchPlayers, setMatchPlayers] = useState<AssignedPlayer[]>([])
  const winnerIds = heights ? judgeWinners(heights) : []

  // 今の画面と参加者の一覧をスマホに知らせる（スマホは自分の番号・色・満員かどうかをここから知る）
  // 途中で参加・再接続したスマホにも届くよう、参加者が変わったときも送り直す
  const winnerKey = winnerIds.join(',')
  useEffect(() => {
    if (!channel) return
    const payload: PhaseMessage = {
      phase,
      players,
      ...(phase === 'result' ? { winnerIds: winnerKey ? winnerKey.split(',') : [] } : {}),
    }
    void channel.send({ type: 'broadcast', event: EVENTS.phase, payload })
  }, [channel, phase, players, winnerKey])

  const canStart = players.length >= MIN_PLAYERS

  const start = () => {
    inputs.current.clear()
    setHeights(null)
    setMatchPlayers(players)
    setRound((r) => r + 1)
    setPhase('playing')
  }

  if (phase === 'playing') {
    return (
      <main className="flex h-full items-center justify-center p-4">
        <GameScreen
          key={round}
          players={matchPlayers}
          getInputs={() => inputs.current.take()}
          onFinish={(h) => {
            setHeights(h)
            setPhase('result')
          }}
        />
      </main>
    )
  }

  if (phase === 'result') {
    const winners = matchPlayers.filter((p) => winnerIds.includes(p.playerId))
    const single = winners.length === 1 ? winners[0] : null
    return (
      <main className="flex h-full flex-col items-center justify-center gap-8 p-4">
        {/* ラフ画どおり：勝った人の番号を大きく、その人の色で。複数なら引き分け */}
        <h1 className="text-7xl" style={{ color: single?.color ?? '#ffffff' }}>
          {single ? `${single.number}P WIN!!` : 'DRAW!!'}
        </h1>
        <div className="flex flex-wrap items-end justify-center gap-8">
          {winners.map((p) => (
            <div key={p.playerId} className="flex flex-col items-center gap-2">
              <CharacterIcon color={p.color} size={single ? 200 : 120} />
              {!single && <span style={{ color: p.color }}>{p.number}P</span>}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <button
            className="border-4 border-[#ff5555] px-8 py-3 text-2xl text-[#ff5555] disabled:opacity-30"
            disabled={!canStart}
            onClick={start}
          >
            もう一度プレイ
          </button>
          <button
            className="border-4 border-[#55aaff] px-8 py-3 text-2xl text-[#55aaff]"
            onClick={() => setPhase('lobby')}
          >
            ホームへ戻る
          </button>
        </div>
        {!canStart && <p className="text-neutral-400">もう一度遊ぶには2人以上の参加が必要です</p>}
      </main>
    )
  }

  const controllerUrl = `${location.origin}/controller?room=${roomCode}`
  const waiting = presentIds.length - players.length
  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-5xl">Jump the highest</h1>
      <div className="flex flex-wrap items-center justify-center gap-6">
        {/* 白い余白（marginSize）がないと読み取れないスマホがあるため、背景を白にして余白を付ける */}
        <QRCodeSVG value={controllerUrl} size={200} marginSize={2} className="block" />
        <div className="flex flex-col gap-2">
          <p className="text-xl">スマホで読み取って参加！</p>
          <p className="text-2xl">
            ルーム：<span className="tracking-widest">{roomCode}</span>
          </p>
          <p className="max-w-80 break-all text-sm text-neutral-400">{controllerUrl}</p>
          {isLocalhost && (
            // localhost はスマホから見ると「スマホ自身」を指すため、QRを読んでもつながらない
            <p className="max-w-80 text-sm text-yellow-300">
              このURLはスマホから開けません。PCのIPアドレス（例：http://192.168.○.○:5173）か公開URLでこの画面を開いてください
            </p>
          )}
        </div>
      </div>
      <p className="text-neutral-400">
        {status === 'connecting' && 'サーバーに接続中…'}
        {status === 'retrying' && '再接続中…（つながらないときは再読み込みしてください）'}
        {status === 'connected' && `参加者 ${players.length} / ${MAX_PLAYERS} 人`}
      </p>
      <ul className="flex flex-wrap justify-center gap-4">
        {players.map((p) => (
          <li key={p.playerId} className="flex flex-col items-center gap-1 text-xl" style={{ color: p.color }}>
            <CharacterIcon color={p.color} size={48} />
            {p.number}P
          </li>
        ))}
      </ul>
      {waiting > 0 && <p className="text-neutral-400">満員のため {waiting} 人が待っています</p>}
      <button
        className="border-4 border-white px-6 py-2 text-2xl disabled:opacity-30"
        disabled={!canStart}
        onClick={start}
      >
        スタート
      </button>
    </main>
  )
}
