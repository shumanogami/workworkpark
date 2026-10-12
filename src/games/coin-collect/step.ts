import { createJumper, type Jumper, type JumperInput, moveJumper } from '../../engine/jumper'
import { resolveJumperCollisions } from '../../engine/jumperCollisions'
import { type Platform, updateOnPlatforms } from '../../engine/platforms'
import { applyPickups, collectItems, createScores, type Item, type Scores } from '../../engine/score'
import { createScroll, type ScrollState, stepScroll, visibleRange } from '../../engine/scroll'
import { COLLISION, GENERATE_AHEAD, RIGHT_LIMIT, GROUND_Y, JUMPER, PLAYER_SIZE, SCROLL, STAGE_WIDTH, TIME_LIMIT } from './constants'
import { createStage, extendStage, GROUND_PLATFORM, nextRandom, type StageGen } from './stage'

// コイン集めの1コマを進める純粋な関数（React・Canvas・通信には触らない）
// 1. 横スクロールを進める（カメラが右へ。画面の左端が「動く壁」で、遅れた人を押して運ぶ）
// 2. 画面の右の少し先まで、コインと足場を足す
// 3. 全員を動かす（画面の右の1/3には行けない）（キャラの物理 → 足場に乗る → キャラどうしの当たり判定）
// 4. 触れたコインを取って足し、毒キノコに触れたら引く（0 未満にはならない）
// 5. 制限時間になったら終わり。一番多い人が勝ち（同数は引き分け）

export type Runner = Jumper & { playerId: string }

// コインを取った場所に出す小さな光（見た目だけ）
export type Pop = { x: number; y: number; age: number; poison: boolean }

export type CoinState = {
  scroll: ScrollState // elapsed がゲーム開始からの秒数
  runners: Runner[]
  platforms: Platform[]
  coins: Item[]
  scores: Scores
  gen: StageGen
  pops: Pop[]
  finished: boolean
  winners: string[] // 勝った人（finished になってから入る。複数なら引き分け）
}

export type CoinInputs = Record<string, JumperInput>

const POP_SECONDS = 0.35
const KEEP_BEHIND = 200 // 画面の左端よりこれだけ左の足場は、もう要らない

export function createCoinState(playerIds: string[], seed: number): CoinState {
  const stage = extendStage(createStage(seed), STAGE_WIDTH + GENERATE_AHEAD)
  // スタート地点に、間を空けて横に並べる（8人でも重ならない）。右ほど最初のコインに近くて有利なので、並ぶ順はラウンドごとにシャッフルする
  const slots = shuffled(playerIds.map((_, i) => i), Math.imul(seed, 0x9e3779b1) ^ 0x85ebca6b)
  const runners = playerIds.map((playerId, i) => ({
    ...createJumper(70 + slots[i] * 56, GROUND_Y - PLAYER_SIZE, PLAYER_SIZE),
    standingOn: 'ground',
    playerId,
  }))
  return {
    scroll: createScroll(SCROLL),
    runners,
    platforms: [GROUND_PLATFORM, ...stage.platforms],
    coins: stage.coins,
    scores: createScores(playerIds),
    gen: stage.gen,
    pops: [],
    finished: false,
    winners: [],
  }
}

// 種から決まる並べ替え（同じ種なら同じ順）
function shuffled<T>(items: T[], seed: number): T[] {
  const a = [...items]
  let s = seed
  for (let i = a.length - 1; i > 0; i--) {
    const [v, next] = nextRandom(s)
    s = next
    const j = Math.floor(v * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 一番多く集めた人たち（同数なら複数）
export function leaders(scores: Scores): string[] {
  const ids = Object.keys(scores)
  const best = Math.max(...ids.map((id) => scores[id]))
  return ids.filter((id) => scores[id] === best)
}

export function step(state: CoinState, inputs: CoinInputs, dt: number): CoinState {
  if (state.finished) return state

  const scroll = stepScroll(state.scroll, SCROLL, dt)
  const { from: left, to: right } = visibleRange(SCROLL, scroll, STAGE_WIDTH)
  const limit = left + RIGHT_LIMIT
  const jumper = { ...JUMPER, minX: left, maxX: limit }
  const collision = { ...COLLISION, minX: left, maxX: limit }

  const stage = extendStage(state.gen, right + GENERATE_AHEAD)
  const platforms = [...state.platforms.filter((p) => p.x + p.width > left - KEEP_BEHIND), ...stage.platforms]

  const moved = state.runners.map((r) => {
    const m = moveJumper(r, inputs[r.playerId], dt, jumper)
    return { ...m, ...updateOnPlatforms(r, m, platforms, platforms) }
  })
  const runners = resolveJumperCollisions(state.runners, moved, collision)

  // コインを取る。画面の左に流れていったコインは捨てる
  const { remaining, pickups } = collectItems(runners, [...state.coins, ...stage.coins])
  const coins = remaining.filter((c) => c.x + c.width > left)
  const scores = applyPickups(state.scores, pickups)
  const pops = [
    ...state.pops.map((p) => ({ ...p, age: p.age + dt })).filter((p) => p.age < POP_SECONDS),
    ...pickups.map((p) => {
      const item = [...state.coins, ...stage.coins].find((c) => c.id === p.itemId)!
      return { x: item.x + item.width / 2, y: item.y + item.height / 2, age: 0, poison: p.points < 0 }
    }),
  ]

  const finished = scroll.elapsed >= TIME_LIMIT
  return {
    ...state,
    scroll,
    runners,
    platforms,
    coins,
    scores,
    gen: stage.gen,
    pops,
    finished,
    winners: finished ? leaders(scores) : [],
  }
}
