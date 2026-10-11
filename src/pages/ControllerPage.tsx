import { useRef, useState, type PointerEvent } from 'react'
import { useSearchParams } from 'react-router'
import { getOrCreatePlayerId, normalizeRoomCode } from '../lib/room'
import { useInputSender, type ButtonName } from '../lib/useInputSender'
import { useRoomChannel } from '../lib/useRoomChannel'
import { EVENTS, type Phase, type PhaseMessage, type PlayerInfo } from '../shared/messages'

const PHASE_LABEL: Record<Phase, string> = {
  lobby: 'PCの画面でスタートを待ってね',
  playing: 'ゲーム中！',
  result: '結果発表！PCの画面を見てね',
}

// スマホ側のコントローラー画面。ラフ画どおり、上に自分の番号（自分の色）、左に ←→、右にジャンプ
export default function ControllerPage() {
  const [searchParams] = useSearchParams()
  const room = normalizeRoomCode(searchParams.get('room'))
  const [playerId] = useState(getOrCreatePlayerId)
  const [phase, setPhase] = useState<Phase>('lobby')
  // PCから届いた参加者一覧。まだ届いていなければ null（満員かどうかも分からない）
  const [players, setPlayers] = useState<PlayerInfo[] | null>(null)

  const { channel, status } = useRoomChannel(room, playerId, (event, payload) => {
    if (event !== EVENTS.phase) return
    const msg = payload as PhaseMessage
    setPhase(msg.phase)
    if (msg.players) setPlayers(msg.players)
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

  const me = players?.find((p) => p.playerId === playerId)
  const isFull = players !== null && !me

  let message = ''
  if (status === 'connecting') message = '接続中…'
  else if (status === 'retrying') message = '再接続中…（つながらないときは再読み込みしてください）'
  else if (isFull) message = '満員です。空きが出たら参加できます'
  else message = PHASE_LABEL[phase]

  return (
    <main className="relative flex h-full touch-none select-none flex-col items-center justify-between overflow-hidden p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-5xl" style={{ color: me?.color ?? '#a3a3a3' }}>
          {me ? `${me.number}P` : '--'}
        </p>
        <p className="text-sm text-neutral-400">{message}</p>
      </div>

      <div className="flex w-full flex-1 items-center justify-around">
        <DirectionPad onChange={setButton} />
        <JumpButton onChange={setButton} />
      </div>

      {/* iPhone の Safari は横向き固定ができないため、縦向きのときは横にするよう案内する */}
      <div className="absolute inset-0 hidden flex-col items-center justify-center gap-4 bg-neutral-900 text-center portrait:flex">
        <p className="text-6xl">📱↻</p>
        <p className="text-2xl">スマホを横にしてね</p>
      </div>
    </main>
  )
}

type ButtonProps = {
  onChange: (name: ButtonName, pressed: boolean) => void
}

// 指を離すまで、この要素の操作として扱う。端末によっては失敗して例外になることがあるが、
// そのせいでボタンが反応しなくなるのを防ぐため、失敗しても続ける（外へずれたときの追従だけが効かなくなる）
function capturePointer(e: PointerEvent<HTMLDivElement>) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    // 何もしない
  }
}

// 丸いボタンの大きさ。横持ちの画面の高さに合わせる（高さの55%、最大で 220px）
const PAD_CLASS = 'size-[min(55vh,220px)] rounded-full border-4 border-white'

// 左の丸：左半分を押すと左、右半分を押すと右。指を滑らせると向きが切り替わる
// 指ごとに向きを覚えておき、どれか1本でも左（右）を押していれば左（右）を押していることにする
function DirectionPad({ onChange }: ButtonProps) {
  const pointers = useRef(new Map<number, -1 | 1>())
  const [dir, setDir] = useState<-1 | 0 | 1>(0)

  const sync = () => {
    const dirs = [...pointers.current.values()]
    const left = dirs.includes(-1)
    const right = dirs.includes(1)
    onChange('left', left)
    onChange('right', right)
    setDir(left === right ? 0 : left ? -1 : 1)
  }

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    pointers.current.set(e.pointerId, e.clientX < rect.left + rect.width / 2 ? -1 : 1)
    sync()
  }

  const release = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    sync()
  }

  return (
    <div
      className={`${PAD_CLASS} flex overflow-hidden`}
      onPointerDown={(e) => {
        // 指が丸の外へずれても、離すまでこの丸の操作として扱う
        capturePointer(e)
        track(e)
      }}
      onPointerMove={(e) => {
        if (pointers.current.has(e.pointerId)) track(e)
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()} // 長押しでメニューが出ないように
    >
      <span className={`flex flex-1 items-center justify-center text-5xl ${dir === -1 ? 'bg-white text-black' : ''}`}>
        ←
      </span>
      <span className={`flex flex-1 items-center justify-center text-5xl ${dir === 1 ? 'bg-white text-black' : ''}`}>
        →
      </span>
    </div>
  )
}

// 右の丸：押している間ジャンプ
function JumpButton({ onChange }: ButtonProps) {
  const [pressed, setPressed] = useState(false)
  const update = (next: boolean) => {
    setPressed(next)
    onChange('jump', next)
  }

  return (
    <div
      className={`${PAD_CLASS} flex items-center justify-center text-3xl ${pressed ? 'bg-white text-black' : ''}`}
      onPointerDown={(e) => {
        capturePointer(e)
        update(true)
      }}
      onPointerUp={() => update(false)}
      onPointerCancel={() => update(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      ジャンプ
    </div>
  )
}
