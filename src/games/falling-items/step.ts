import { createJumper, type Jumper, type JumperInput, moveJumper } from '../../engine/jumper'
import { carryRiders } from '../../engine/carry'
import { resolveJumperCollisions } from '../../engine/jumperCollisions'
import { OBJECT_SIZE, hitRect } from '../../engine/objects'
import { type Platform, updateOnPlatforms } from '../../engine/platforms'
import { applyPickups, collectItems, createScores, type Item, type Pickup, type Scores } from '../../engine/score'
import {
  BASE_PLAYERS,
  CLUSTER_RATIO,
  CLUSTER_SPREAD,
  COIN_POINTS,
  COLLISION,
  FALL_SPEED_END,
  FALL_SPEED_JITTER,
  FALL_SPEED_START,
  FIRST_SPAWN_SECONDS,
  GROUND_Y,
  INTERVAL_END,
  INTERVAL_START,
  JUMPER,
  PLAYER_SIZE,
  POISON_POINTS,
  POISON_RATIO,
  ROUND_SECONDS,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'

// 落下物避けの1コマを進める純粋な関数（React・Canvas・通信には触らない）
// 1. 物を降らせる（時間とともに数が増え、速くなる）。地面に着いた物は消える
// 2. 全員を動かす（キャラの物理 → 地面に乗る → キャラどうしの当たり判定）
// 3. 物に触れた人が取る（コインは加点、毒キノコは減点）。同時に触れたら物の中心に近い人
// 4. 時間になったら終わり。一番点が高い人が勝ち（同点なら引き分け）

export type Runner = Jumper & { playerId: string }
export type ItemKind = 'coin' | 'poison'
export type FallingItem = { id: string; kind: ItemKind; x: number; y: number; vy: number } // x・y は見た目の左上

export type FallingState = {
  elapsed: number // ゲーム開始からの秒数
  runners: Runner[]
  items: FallingItem[]
  scores: Scores
  seed: number // 乱数の種（物の位置・種類を決める。進めるたびに更新する）
  lastX: number // 最後に降らせた物の x（固めて降らせるときの目印）
  spawnTimer: number // 次の物が降るまでの秒数
  nextId: number
  pickups: Pickup[] // このコマで取られたもの（音を鳴らす判断に使う）
  finished: boolean
  winners: string[] // 勝った人（finished になってから入る。複数なら引き分け）
}

export type FallingInputs = Record<string, JumperInput>

const FLOOR: Platform = { id: 'floor', x: WALL_WIDTH, y: GROUND_Y, width: STAGE_WIDTH - WALL_WIDTH * 2, height: 40 }

// 乱数（mulberry32）。状態を持たない形にして、step を純粋な関数のままにする
export function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), s | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

export function createFallingState(playerIds: string[], seed: number): FallingState {
  // 地面に、間を空けて横に並べる（8人でも重ならない）
  const span = STAGE_WIDTH - WALL_WIDTH * 2
  const runners = playerIds.map((playerId, i) => {
    const cx = WALL_WIDTH + (span * (i + 1)) / (playerIds.length + 1)
    return { ...createJumper(cx - PLAYER_SIZE / 2, GROUND_Y - PLAYER_SIZE, PLAYER_SIZE), standingOn: 'floor', playerId }
  })
  return {
    elapsed: 0,
    runners,
    items: [],
    scores: createScores(playerIds),
    seed,
    lastX: STAGE_WIDTH / 2,
    spawnTimer: FIRST_SPAWN_SECONDS,
    nextId: 0,
    pickups: [],
    finished: false,
    winners: [],
  }
}

function progress(elapsed: number): number {
  return Math.min(Math.max(elapsed / ROUND_SECONDS, 0), 1)
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// 物が降る間隔（秒）。人数が多いほど詰める（基準は4人。2人より少なくても2人分）
export function spawnInterval(elapsed: number, playerCount: number): number {
  const scale = Math.max(playerCount, 2) / BASE_PLAYERS
  return lerp(INTERVAL_START, INTERVAL_END, progress(elapsed)) / scale
}

// 物の落ちる速さ（ピクセル/秒）の基準
export function fallSpeed(elapsed: number): number {
  return lerp(FALL_SPEED_START, FALL_SPEED_END, progress(elapsed))
}

// 物の当たり判定の枠（取る側との重なりを調べる）
function itemRect(it: FallingItem): Item {
  const r = hitRect(it.kind, it.x, it.y)
  return { ...r, id: it.id, points: it.kind === 'coin' ? COIN_POINTS : POISON_POINTS, kind: it.kind }
}

export function step(state: FallingState, inputs: FallingInputs, dt: number): FallingState {
  if (state.finished) return state
  const elapsed = state.elapsed + dt

  // 1. 物を降らせる（画面の上の外から出る）。地面に着いた物は消える
  let { seed, nextId, spawnTimer, lastX } = state
  const falling = state.items
    .map((it) => ({ ...it, y: it.y + it.vy * dt }))
    .filter((it) => it.y + OBJECT_SIZE[it.kind].height < GROUND_Y)
  spawnTimer -= dt
  while (spawnTimer <= 0) {
    let r1, r2, r3, r4
    ;[r1, seed] = nextRandom(seed)
    ;[r2, seed] = nextRandom(seed)
    ;[r3, seed] = nextRandom(seed)
    ;[r4, seed] = nextRandom(seed)
    const kind: ItemKind = r1 < POISON_RATIO ? 'poison' : 'coin'
    const size = OBJECT_SIZE[kind]
    const minX = WALL_WIDTH
    const maxX = STAGE_WIDTH - WALL_WIDTH - size.width
    // 一部は前の物の近くに降らせる（固まりになる）。それ以外は壁の内側のどこでも
    const near = lastX + (r2 * 2 - 1) * CLUSTER_SPREAD
    const x = Math.min(Math.max(r4 < CLUSTER_RATIO ? near : minX + r2 * (maxX - minX), minX), maxX)
    lastX = x
    const vy = fallSpeed(elapsed) * (1 + (r3 * 2 - 1) * FALL_SPEED_JITTER)
    falling.push({ id: `i${nextId++}`, kind, x, y: -size.height, vy })
    spawnTimer += spawnInterval(elapsed, state.runners.length)
  }

  // 2. 全員を動かす（Jump the highest と同じ：頭に乗れる・横からぶつかると弾かれる）
  const platforms = [FLOOR]
  const moved = state.runners.map((r) => {
    const m = moveJumper(r, inputs[r.playerId], dt, JUMPER)
    return { ...m, ...updateOnPlatforms(r, m, platforms, platforms) }
  })
  // 頭の上に乗っている人は、下の人が横に動いた分だけ一緒に運ばれる（Jump the highest と同じ）
  const carried = carryRiders(state.runners, moved, JUMPER.minX, JUMPER.maxX)
  const runners = resolveJumperCollisions(state.runners, carried, COLLISION)

  // 3. 物を取る
  const { pickups } = collectItems(runners.map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height, playerId: r.playerId })), falling.map(itemRect))
  const taken = new Set(pickups.map((p) => p.itemId))
  const scores = applyPickups(state.scores, pickups)
  let items = falling.filter((it) => !taken.has(it.id))

  // 4. 時間になったら終わり。一番点が高い人が勝ち（同点なら引き分け）
  const finished = elapsed >= ROUND_SECONDS
  let winners: string[] = []
  if (finished) {
    items = []
    const best = Math.max(...Object.values(scores))
    winners = runners.filter((r) => scores[r.playerId] === best).map((r) => r.playerId)
  }
  return { ...state, elapsed, runners, items, scores, seed, lastX, spawnTimer, nextId, pickups, finished, winners }
}
