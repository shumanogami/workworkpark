import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { startBgm, stopBgm } from '../audio/bgm'
import { LOBBY_SCORE } from '../audio/score'
import CharacterIcon from '../game/CharacterIcon'
import { InputBuffer, isInputMessage } from '../lib/inputBuffer'
import { displayName, isNameMessage, normalizeName, rememberNames, resolveNames } from '../lib/playerName'
import { addLatecomers, assignPlayers, MAX_PLAYERS, type AssignedPlayer } from '../lib/players'
import { getOrCreateRoomCode } from '../lib/room'
import { useRoomChannel } from '../lib/useRoomChannel'
import {
  addPlayers,
  afterMiniResult,
  afterResult,
  createMatch,
  finishRound,
  type MatchStage,
  type MatchState,
} from '../platform/match'
import ChampionScreen from '../platform/ChampionScreen'
import Instruction from '../platform/Instruction'
import MiniResult from '../platform/MiniResult'
import ResultStairs from '../platform/ResultStairs'
import { findMiniGame, GAMES_IN_DEVELOPMENT, MINI_GAMES } from '../platform/registry'
import type { MiniGamePlayer } from '../platform/types'
import { EVENTS, type Phase, type PhaseMessage } from '../shared/messages'

const MIN_PLAYERS = 2

// ラウンドの合間は自動で次へ進む（docs/方針.md・docs/画面遷移図.html の F1）
const MINI_RESULT_MS = 3000
const RESULT_MS = 4000


// 開発用：URL に ?game=magma-rush を付けると、そのミニゲームだけを遊ぶ（スマホ操作で1本だけ試すため）。当てはまるものがなければ全部
const ONLY_GAME = new URLSearchParams(location.search).get('game')
// 作成中のゲーム（GAMES_IN_DEVELOPMENT）も、?game= で指定したときだけ遊べる
const GAME_IDS = [...MINI_GAMES, ...GAMES_IN_DEVELOPMENT].filter((g) => ONLY_GAME && g.id === ONLY_GAME).map((g) => g.id)
if (GAME_IDS.length === 0) GAME_IDS.push(...MINI_GAMES.map((g) => g.id))

// 試合の段階（match.ts）を、スマホへ送る画面の状態（messages.ts の Phase）に変える
const PHASE_OF_STAGE: Record<MatchStage, Phase> = {
  round: 'playing',
  miniResult: 'miniResult',
  result: 'result',
  champion: 'champion',
}

// PC側の画面。ホーム → ラウンド → ミニリザルト → リザルト（階段）→ … → 総合優勝 を切り替える（流れは docs/画面遷移図.html）
// 何勝したか・何段目か・次に遊ぶミニゲームは、試合の進行（src/platform/match.ts）が決める
export default function HostPage() {
  const [roomCode] = useState(getOrCreateRoomCode)
  // 試合の進行。ホームにいる間は null
  const [match, setMatch] = useState<MatchState | null>(null)

  // 入力はゲームの1コマごとに読むので、state ではなく ref に置く（届くたびに再描画しないように）
  const inputs = useRef(new InputBuffer())

  // Broadcast ですぐに届いた名前（playerId → 名前）。Presence が追いつくまで表示に使う
  const [pendingNames, setPendingNames] = useState<Record<string, string>>({})

  // presenceNames：スマホで付けた名前（Presence で届く。約3秒遅れる）
  const {
    channel,
    status,
    presentIds,
    names: presenceNames,
  } = useRoomChannel(roomCode, undefined, (event, payload) => {
    if (event === EVENTS.input && isInputMessage(payload)) inputs.current.receive(payload)
    if (event === EVENTS.name && isNameMessage(payload)) {
      setPendingNames((prev) => ({ ...prev, [payload.playerId]: normalizeName(payload.name) }))
    }
  })

  // 表示に使う名前。名前がない人は「{番号}P」と表示する
  const resolved = resolveNames(presenceNames, pendingNames)
  const names = resolved.names
  // Presence が追いついた分は取り除く（Presence が変わったときだけ。effect を使わず描画中に更新する）
  const [seenPresenceNames, setSeenPresenceNames] = useState(presenceNames)
  if (seenPresenceNames !== presenceNames) {
    setSeenPresenceNames(presenceNames)
    setPendingNames(resolved.pending)
  }

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

  // 試合中にスマホが切れても名前を「{番号}P」に戻さないよう、最後に分かっていた名前を覚えておく（方針.md の Q4）
  // 変わったときだけ覚え直す（effect を使わず描画中に更新する）
  const [knownNames, setKnownNames] = useState<Record<string, string>>({})
  const remembered = rememberNames(knownNames, names, presentIds)
  if (remembered !== knownNames) setKnownNames(remembered)

  // 試合の参加者。スタートの時点で決め、途中で来た人は次のラウンドの始めに加える（途中で抜けた人も残す）
  const [matchPlayers, setMatchPlayers] = useState<AssignedPlayer[]>([])
  const miniGamePlayers: MiniGamePlayer[] = matchPlayers.map((p) => ({
    ...p,
    // 今の名前を優先し、切れている人は覚えていた名前を使う
    name: displayName(names[p.playerId] ?? remembered[p.playerId], p.number),
  }))

  // 切れた人の入力は「何も押していない」にする（最後の入力のまま走り続けないように）
  useEffect(() => {
    inputs.current.keepOnly(presentIds)
  }, [presentIds])

  // 次のラウンドへ進むときに、途中で来た人を加えるため、今つながっている人をタイマーから読めるようにしておく
  const presentIdsRef = useRef(presentIds)
  useEffect(() => {
    presentIdsRef.current = presentIds
  }, [presentIds])

  const game = match ? findMiniGame(match.gameId) : undefined
  const phase: Phase = match ? PHASE_OF_STAGE[match.stage] : 'lobby'

  // 今の画面と参加者の一覧をスマホに知らせる（スマホは自分の番号・色・満員かどうかをここから知る）
  // 途中で参加・再接続したスマホにも届くよう、参加者が変わったときも送り直す
  useEffect(() => {
    if (!channel) return
    // 状態ごとの「勝った人」：ミニリザルトはそのラウンド、リザルトはそのミニゲーム、総合優勝は優勝者
    const winnerIds =
      match?.stage === 'miniResult'
        ? match.roundWinners
        : match?.stage === 'result'
          ? match.gameWinners
          : match?.stage === 'champion'
            ? match.champions
            : undefined
    const payload: PhaseMessage = {
      phase,
      // ホームでは接続中の人、試合中は試合の参加者を送る（途中で来た人は、次のラウンドで加わるまで一覧にいない）
      players: phase === 'lobby' ? players : matchPlayers,
      ...(winnerIds ? { winnerIds } : {}),
      ...(match && game
        ? { gameTitle: game.title, instruction: game.instruction, wins: match.wins, steps: match.steps }
        : {}),
    }
    void channel.send({ type: 'broadcast', event: EVENTS.phase, payload })
  }, [channel, phase, players, matchPlayers, match, game])

  // ミニリザルト・リザルトは、決めた時間が経ったら自動で次へ進む
  // （match.ts の関数は今の段階でなければ何もしないので、2回呼ばれても進みすぎない）
  const stage = match?.stage
  useEffect(() => {
    if (!match || (stage !== 'miniResult' && stage !== 'result')) return
    const id = setTimeout(
      () => {
        inputs.current.clear() // 前のラウンドの押しっぱなしを次のラウンドに持ち越さない
        const next = stage === 'miniResult' ? afterMiniResult(match) : afterResult(match, GAME_IDS)
        // 次のラウンドが始まるときだけ、途中で来た人を加える（ラウンドの最中はミニゲームが参加者を変えられないため）
        if (next.stage === 'round') {
          const joined = addLatecomers(matchPlayers, presentIdsRef.current)
          if (joined !== matchPlayers) {
            setMatchPlayers(joined)
            setMatch(addPlayers(next, joined.map((p) => p.playerId)))
            return
          }
        }
        setMatch(next)
      },
      stage === 'miniResult' ? MINI_RESULT_MS : RESULT_MS,
    )
    return () => clearTimeout(id)
  }, [stage, match, matchPlayers])

  // エントリー画面の間だけ BGM を流す（ラウンドに入るとゲームの BGM に代わる）
  useEffect(() => {
    if (phase !== 'lobby') return
    startBgm(LOBBY_SCORE)
    return () => stopBgm()
  }, [phase])

  const canStart = players.length >= MIN_PLAYERS

  const start = () => {
    // スタートのクリックは「利用者の操作」なので、ここで全画面に入れる（ブラウザは操作の直後にしか許さない）
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {})
    inputs.current.clear()
    setMatchPlayers(players)
    setMatch(createMatch(players.map((p) => p.playerId), GAME_IDS))
  }

  const goHome = () => {
    // 途中で加わった人の番号と色が、ホームに戻って変わらないよう、試合の割り当てを引き継ぐ
    setAssigned({ ids: presentIds, players: assignPlayers(matchPlayers, presentIds) })
    setMatch(null)
  }

  if (match && match.stage === 'round' && game) {
    // ラウンドごとに作り直す（ミニゲームは1ラウンド分のことだけを考える）
    const roundKey = `${match.played.length}-${match.gameId}-${match.roundNumber}`
    return (
      <main className="relative flex h-full items-center justify-center">
        <game.Round
          key={roundKey}
          players={miniGamePlayers}
          getInputs={() => inputs.current.take()}
          onRoundEnd={(winnerIds) => setMatch((m) => (m ? finishRound(m, winnerIds) : m))}
        />
        <Instruction key={`instruction-${roundKey}`} text={game.instruction} />
      </main>
    )
  }

  if (match && match.stage === 'miniResult' && game) {
    return (
      <MiniResult
        gameTitle={game.title}
        roundNumber={match.roundNumber}
        players={miniGamePlayers}
        wins={match.wins}
        roundWinners={match.roundWinners}
      />
    )
  }

  if (match && match.stage === 'result') {
    return (
      <ResultStairs
        gameTitle={game?.title ?? ''}
        players={miniGamePlayers}
        steps={match.steps}
        gameWinners={match.gameWinners}
      />
    )
  }

  if (match && match.stage === 'champion') {
    // 総合優勝：ドラムロール → 発表（ファンファーレ・紙吹雪・表彰台）→ ホームへ戻る（F7）
    return <ChampionScreen players={miniGamePlayers} champions={match.champions} onHome={goHome} />
  }

  const controllerUrl = `${location.origin}/controller?room=${roomCode}`
  const waiting = presentIds.length - players.length
  const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

  return (
    <main className="flex h-full flex-col items-center justify-center gap-6 p-4">
      <h1 className="text-5xl">WorkWorkPark</h1>
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
            {displayName(names[p.playerId], p.number)}
          </li>
        ))}
      </ul>
      {waiting > 0 && <p className="text-neutral-400">満員のため {waiting} 人が待っています</p>}
      <p className="text-neutral-400">試合の途中でも、QRを読めば次のラウンドから参加できます</p>
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
