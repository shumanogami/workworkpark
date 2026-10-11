import { overlaps, type Rect } from './rect'

// 脱落と「最後まで生き残った人が勝ち」の部品。どのゲームからも使えるよう、特定のゲームの物理・描画には依存しない
// 画面・音には触らない純粋な関数（テストしやすくするため）
//
// 脱落した人は「画面に描かない」「操作を受け付けない」「物理で動かさない」。その振り分けは
// isAlive / onlyAlive で行う（どう描かないか・どう止めるかは、ゲームごとに決める）
//
// ゲーム側の1コマの進め方：
//   1. 生きている人だけを動かす（onlyAlive で入力・キャラを絞る）
//   2. touchingHazards(キャラ, 危険物) で、マグマや毒に触れた人を調べる。画面の外へ出た人は isOutside で調べる
//   3. eliminate(状態, 触れた人, 今の時刻, 理由) で脱落させる
//   4. judgeSurvivor(状態) で勝負がついたかを調べる

export type Elimination = {
  playerId: string
  at: number // 脱落した時刻（秒。ゲーム開始からの経過時間）
  cause: string // 脱落の理由（例：'lava'、'poison'、'out'）。演出や結果の表示に使う
}

export type SurvivalState = {
  players: string[] // 参加者（開始時の全員）
  eliminated: Elimination[] // 脱落した順
}

export function createSurvival(playerIds: string[]): SurvivalState {
  return { players: [...playerIds], eliminated: [] }
}

export function isAlive(state: SurvivalState, playerId: string): boolean {
  return state.players.includes(playerId) && !state.eliminated.some((e) => e.playerId === playerId)
}

export function aliveIds(state: SurvivalState): string[] {
  return state.players.filter((id) => isAlive(state, id))
}

// 生きている人のものだけに絞る（描くキャラ・受け付ける入力・動かすキャラなど）
export function onlyAlive<T extends { playerId: string }>(state: SurvivalState, list: T[]): T[] {
  return list.filter((x) => isAlive(state, x.playerId))
}

// 脱落させる。すでに脱落している人・参加者でない人は無視する
export function eliminate(state: SurvivalState, playerIds: string[], at: number, cause: string): SurvivalState {
  const added = [...new Set(playerIds)]
    .filter((id) => isAlive(state, id))
    .map((playerId) => ({ playerId, at, cause }))
  if (added.length === 0) return state
  return { ...state, eliminated: [...state.eliminated, ...added] }
}

// 危険物（マグマ・毒の沼・トゲなど）
export type Hazard = Rect & {
  id: string
  cause: string // 触れたときの脱落の理由（例：'lava'）
}

// 危険物に触れている人と、その理由。複数に触れていたら、先に並んでいる危険物を理由にする
export function touchingHazards(
  bodies: (Rect & { playerId: string })[],
  hazards: Hazard[],
): { playerId: string; cause: string }[] {
  const result: { playerId: string; cause: string }[] = []
  for (const b of bodies) {
    const hit = hazards.find((h) => overlaps(b, h))
    if (hit) result.push({ playerId: b.playerId, cause: hit.cause })
  }
  return result
}

// 体が画面（view）の外へ完全に出たか。スクロールに置いていかれた人を脱落させるときに使う
// margin を付けると、その分だけはみ出しても許す（ちらっと画面外に出ただけで脱落しないように）
export function isOutside(body: Rect, view: Rect, margin = 0): boolean {
  return (
    body.x + body.width < view.x - margin ||
    body.x > view.x + view.width + margin ||
    body.y + body.height < view.y - margin ||
    body.y > view.y + view.height + margin
  )
}

// ---- 勝敗 ----

export type SurvivalResult = {
  decided: boolean // 勝負がついたか
  winners: string[] // 勝った人（複数なら引き分け）。決まっていなければ空
}

// 最後まで生き残った人が勝ち
// - 2人以上で始めた場合：残りが1人になったら、その人の勝ち
// - 最後の数人が同じ時刻に脱落して全滅したら、その人たちの引き分け
// - 1人で始めた場合（練習など）：脱落するまで勝負はつかない
export function judgeSurvivor(state: SurvivalState): SurvivalResult {
  const alive = aliveIds(state)
  const minAlive = state.players.length >= 2 ? 1 : 0
  if (alive.length > minAlive) return { decided: false, winners: [] }
  if (alive.length === 1) return { decided: true, winners: alive }
  return { decided: true, winners: lastEliminated(state) }
}

// 制限時間で終わったときの勝ち。生き残っている全員の引き分け（全滅していれば、最後に脱落した人たち）
export function judgeAtTimeUp(state: SurvivalState): SurvivalResult {
  const alive = aliveIds(state)
  return { decided: true, winners: alive.length > 0 ? alive : lastEliminated(state) }
}

function lastEliminated(state: SurvivalState): string[] {
  if (state.eliminated.length === 0) return []
  const lastAt = Math.max(...state.eliminated.map((e) => e.at))
  return state.eliminated.filter((e) => e.at === lastAt).map((e) => e.playerId)
}

// 順位（1位から）。生き残っている人が1位、あとは脱落が遅かった人ほど上位。同じ時刻に脱落した人は同じ順位
export function ranking(state: SurvivalState): { playerId: string; rank: number }[] {
  const alive = aliveIds(state)
  const result = alive.map((playerId) => ({ playerId, rank: 1 }))
  const byTime = [...state.eliminated].sort((a, b) => b.at - a.at)
  let rank = alive.length + 1
  for (let i = 0; i < byTime.length; i++) {
    if (i > 0 && byTime[i].at !== byTime[i - 1].at) rank = alive.length + i + 1
    result.push({ playerId: byTime[i].playerId, rank })
  }
  return result
}
