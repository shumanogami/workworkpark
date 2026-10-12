// 試合の進行。何勝したか・何段目か・次にどのミニゲームを遊ぶかを決める
// 画面・通信・音には触らない純粋な関数（テストしやすくするため）。ルールの正は docs/方針.md
//
// 流れ：ラウンド → ミニリザルト → （だれかが3勝したら）リザルト（階段）→ （だれかが一番上なら）総合優勝
//   createMatch で始め、ラウンドが終わったら finishRound、ミニリザルトが終わったら afterMiniResult、
//   リザルトが終わったら afterResult を呼ぶ。今どの画面かは stage を見る

// そのミニゲームの勝者になるのに必要なラウンドの勝ち数
export const WINS_TO_CLEAR = 3

// 総合優勝に必要な段数（階段の高さ）
export const STEPS_TO_WIN = 2

// round：ラウンドを遊んでいる、miniResult：ミニリザルト、result：リザルト（階段）、champion：総合優勝
export type MatchStage = 'round' | 'miniResult' | 'result' | 'champion'

export type MatchState = {
  stage: MatchStage
  players: string[] // 参加者（試合の始めに決め、途中で来た人は addPlayers で加える。抜けた人も残す）
  gameId: string // 今遊んでいるミニゲーム
  played: string[] // 今の一巡で遊んだミニゲーム（全部遊ぶまで同じゲームを選ばないため）
  roundNumber: number // 今のミニゲームの何ラウンド目か（1から）
  wins: Record<string, number> // 今のミニゲームでのラウンドの勝ち数（ライトの数）
  steps: Record<string, number> // 階段の段数
  roundWinners: string[] // 直前のラウンドで勝った人（ミニリザルトでライトが点く人）
  gameWinners: string[] // 直前に決まったミニゲームの勝者（リザルトで1段上がる人）
  champions: string[] // 総合優勝した人（複数なら引き分け）
}

// 0 以上 1 未満の乱数を返す関数。テストでは決まった値を返す関数を渡して、結果を毎回同じにする
export type Random = () => number

function zeros(players: string[]): Record<string, number> {
  return Object.fromEntries(players.map((id) => [id, 0]))
}

// 次に遊ぶミニゲームを選ぶ。今の一巡でまだ遊んでいないものからランダムに選ぶ
// 全部遊び終えていたら、一巡をやり直して全部の中から選ぶ（方針.md の Q5）
export function pickNextGame(
  gameIds: readonly string[],
  played: string[],
  random: Random,
): { gameId: string; played: string[] } {
  if (gameIds.length === 0) throw new Error('ミニゲームが1本も登録されていません')
  let remaining = gameIds.filter((id) => !played.includes(id))
  let cycle = played
  if (remaining.length === 0) {
    remaining = [...gameIds]
    cycle = []
  }
  const gameId = remaining[Math.min(Math.floor(random() * remaining.length), remaining.length - 1)]
  return { gameId, played: [...cycle, gameId] }
}

// 試合を始める。参加者はここで固定する
export function createMatch(players: string[], gameIds: readonly string[], random: Random = Math.random): MatchState {
  const { gameId, played } = pickNextGame(gameIds, [], random)
  return {
    stage: 'round',
    players: [...players],
    gameId,
    played,
    roundNumber: 1,
    wins: zeros(players),
    steps: zeros(players),
    roundWinners: [],
    gameWinners: [],
    champions: [],
  }
}

// 試合の途中で来た人を加える。勝ち数も段数も0から始める（方針.md の「途中参加」）
// ラウンドの最中はミニゲームが参加者を最初に決めてしまうので加えない（次のラウンドの始めに呼ぶ）
// すでにいる人は二重に加えない。加わる人がいなければ同じ state を返す
export function addPlayers(state: MatchState, ids: string[]): MatchState {
  if (state.stage === 'champion') return state
  const added = [...new Set(ids)].filter((id) => !state.players.includes(id))
  if (added.length === 0) return state
  return {
    ...state,
    players: [...state.players, ...added],
    wins: { ...state.wins, ...zeros(added) },
    steps: { ...state.steps, ...zeros(added) },
  }
}

// ラウンドが終わった。勝った人のライトを1つずつ点けて、ミニリザルトへ
// 引き分けなら勝った全員、全員引き分け（ミニゲームが全員を返す）なら全員に点く（方針.md の Q1）
// 参加者でない id は無視する。だれも勝っていなければ、だれのライトも点かない
export function finishRound(state: MatchState, winnerIds: string[]): MatchState {
  if (state.stage !== 'round') return state
  const winners = state.players.filter((id) => winnerIds.includes(id))
  const wins = { ...state.wins }
  for (const id of winners) wins[id] += 1
  return { ...state, stage: 'miniResult', wins, roundWinners: winners }
}

// ミニリザルトが終わった
// - だれかが3勝していたら、その人たち（同時なら全員。Q2）がミニゲームの勝者。1段上がってリザルトへ
// - まだなら、同じミニゲームの次のラウンドへ
export function afterMiniResult(state: MatchState): MatchState {
  if (state.stage !== 'miniResult') return state
  const gameWinners = state.players.filter((id) => state.wins[id] >= WINS_TO_CLEAR)
  if (gameWinners.length === 0) {
    return { ...state, stage: 'round', roundNumber: state.roundNumber + 1, roundWinners: [] }
  }
  const steps = { ...state.steps }
  for (const id of gameWinners) steps[id] += 1
  return { ...state, stage: 'result', steps, gameWinners }
}

// リザルトが終わった
// - だれかが一番上に着いていたら、その人たち（同時なら全員。Q3）が総合優勝
// - まだなら、次のミニゲームをランダムに選び、ラウンドの勝ち数を0に戻して1ラウンド目へ
export function afterResult(state: MatchState, gameIds: readonly string[], random: Random = Math.random): MatchState {
  if (state.stage !== 'result') return state
  const champions = state.players.filter((id) => state.steps[id] >= STEPS_TO_WIN)
  if (champions.length > 0) return { ...state, stage: 'champion', champions }
  const { gameId, played } = pickNextGame(gameIds, state.played, random)
  return {
    ...state,
    stage: 'round',
    gameId,
    played,
    roundNumber: 1,
    wins: zeros(state.players),
    roundWinners: [],
    gameWinners: [],
  }
}
