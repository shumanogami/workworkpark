import { useRef, useState, type PointerEvent } from 'react'
import { playDecide } from '../audio/sfx'
import { controllerView } from '../lib/controllerView'
import { displayName, limitName, loadName, normalizeName, saveName } from '../lib/playerName'
import { useSearchParams } from 'react-router'
import { MAX_PLAYERS } from '../lib/players'
import { getOrCreatePlayerId, normalizeRoomCode } from '../lib/room'
import { useInputSender, type ButtonName } from '../lib/useInputSender'
import { useRoomChannel } from '../lib/useRoomChannel'
import { EVENTS, type NameMessage, type PhaseMessage, type PlayerInfo } from '../shared/messages'
import ControllerPanel from './ControllerPanel'

// ボタンを出している間の、名前の下の小さい文字。ラウンドの合間は ControllerPanel に結果を大きく出す（M9）
const LOBBY_LABEL = 'PCの画面でスタートを待ってね'

// スマホ側のコントローラー画面。ラフ画どおり、上に自分の番号（自分の色）、左に ←→、右にジャンプ
export default function ControllerPage() {
  const [searchParams] = useSearchParams()
  const room = normalizeRoomCode(searchParams.get('room'))
  const [playerId] = useState(getOrCreatePlayerId)
  // PCから最後に届いた画面の状態。まだ届いていなければホーム扱い
  const [phaseMsg, setPhaseMsg] = useState<PhaseMessage>({ phase: 'lobby' })
  const phase = phaseMsg.phase
  // PCから届いた参加者一覧。まだ届いていなければ null（満員かどうかも分からない）
  const [players, setPlayers] = useState<PlayerInfo[] | null>(null)
  // 自分で付けた名前（空なら「{番号}P」と表示）。保存しておき、再読み込みしても同じ名前を使う
  const [name, setName] = useState(loadName)

  const { channel, status } = useRoomChannel(
    room,
    playerId,
    (event, payload) => {
      if (event !== EVENTS.phase) return
      const msg = payload as PhaseMessage
      setPhaseMsg(msg)
      if (msg.players) setPlayers(msg.players)
    },
    name,
  )
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

  // 何を出すか（ボタンか、結果か）。つながっていない・参加できないときは、ボタンのまま下の文字で知らせる
  const view = me ? controllerView(phaseMsg, playerId) : { kind: 'buttons' as const }

  let message = ''
  if (status === 'connecting') message = '接続中…'
  else if (status === 'retrying') message = '再接続中…（つながらないときは再読み込みしてください）'
  // 自分が参加者にいない：ホームなら満員。試合中は次のラウンドの始めにPCが加える（満員・優勝が決まった後は加わらない）
  else if (isFull && phase === 'lobby') message = '満員です。空きが出たら参加できます'
  else if (isFull && phase === 'champion') message = '試合が終わりました。次の試合から参加できます'
  else if (isFull && players.length >= MAX_PLAYERS) message = '満員のため参加できません。次の試合を待ってね'
  else if (isFull) message = '次のラウンドから参加！少し待ってね'
  else if (phase === 'lobby') message = LOBBY_LABEL

  return (
    <main className="relative flex h-full touch-none select-none flex-col items-center justify-between overflow-hidden p-4">
      <div className="flex flex-col items-center gap-1 text-center">
        {me ? (
          <PlayerName
            name={name}
            number={me.number}
            color={me.color}
            // 試合中は誤ってタップしてキーボードが出ないよう、名前を変えられないようにする
            editable={phase !== 'playing'}
            onConfirm={(next) => {
              setName(next) // Presence の登録内容の更新は useRoomChannel が行う（PCに届くまで約3秒かかる）
              saveName(next)
              playDecide()
              // PCの表示をすぐ変えるため、Broadcast でも名前を送る
              const payload: NameMessage = { playerId, name: next }
              void channel?.send({ type: 'broadcast', event: EVENTS.name, payload })
            }}
          />
        ) : (
          <p className="text-5xl text-neutral-400">--</p>
        )}
        {message && <p className="text-sm text-neutral-400">{message}</p>}
      </div>

      {view.kind === 'panel' && !message && me ? (
        // ラウンドの合間はボタンが効かない（入力を送っていない）ので、ボタンを隠して結果を大きく出す
        <ControllerPanel view={view} color={me.color} />
      ) : (
        <div className="flex w-full flex-1 items-center justify-around">
          <DirectionPad onChange={setButton} />
          <JumpButton onChange={setButton} />
        </div>
      )}

      {/* iPhone の Safari は横向き固定ができないため、縦向きのときは横にするよう案内する */}
      <div className="absolute inset-0 hidden flex-col items-center justify-center gap-4 bg-neutral-900 text-center portrait:flex">
        <p className="text-6xl">📱↻</p>
        <p className="text-2xl">スマホを横にしてね</p>
      </div>
    </main>
  )
}

type PlayerNameProps = {
  name: string
  number: number
  color: string
  editable: boolean
  onConfirm: (name: string) => void
}

// 自分のプレイヤー名。タップすると入力欄に切り替わり、Enter か入力欄の外をタップすると確定する
// 空欄で確定すると初期値（「{番号}P」）に戻る。9文字目以降は入らない
function PlayerName({ name, number, color, editable, onConfirm }: PlayerNameProps) {
  const [draft, setDraft] = useState<string | null>(null) // 編集中の文字。編集していなければ null
  const composing = useRef(false) // 日本語入力の変換中か（変換中に文字を切ると入力が壊れるため、確定後に切る）

  if (draft === null) {
    return (
      <button
        className="flex flex-col items-center disabled:cursor-default"
        style={{ color }}
        disabled={!editable}
        onClick={() => setDraft(name)}
      >
        <span className="text-5xl">{displayName(name, number)}</span>
        {editable && <span className="text-xs text-neutral-400">タップで名前を変える</span>}
      </button>
    )
  }

  const confirm = () => {
    onConfirm(normalizeName(draft))
    setDraft(null)
  }

  return (
    <input
      // 画面全体でタッチ操作・文字選択を止めているので、入力欄だけは戻す
      className="w-[9em] touch-auto select-text border-b-4 bg-transparent text-center text-4xl outline-none"
      style={{ color, borderColor: color }}
      autoFocus
      enterKeyHint="done"
      placeholder={`${number}P`}
      value={draft}
      onChange={(e) => setDraft(composing.current ? e.target.value : limitName(e.target.value))}
      onCompositionStart={() => (composing.current = true)}
      onCompositionEnd={(e) => {
        composing.current = false
        setDraft(limitName(e.currentTarget.value))
      }}
      onKeyDown={(e) => {
        // 日本語入力の変換を確定する Enter では名前を確定しない（Safari は変換確定の Enter を keyCode 229 で送る）
        const isImeEnter = composing.current || e.nativeEvent.isComposing || e.keyCode === 229
        if (e.key === 'Enter' && !isImeEnter) e.currentTarget.blur() // 確定は onBlur でまとめて行う
      }}
      onBlur={confirm}
    />
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
