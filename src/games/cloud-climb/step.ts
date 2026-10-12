import { createJumper, type Jumper, type JumperInput, moveJumper } from '../../engine/jumper'
import { resolveJumperCollisions } from '../../engine/jumperCollisions'
import { type Platform, updateOnPlatforms } from '../../engine/platforms'
import { createScroll, type ScrollState, stepScroll, toScreen, visibleRange } from '../../engine/scroll'
import { createSurvival, eliminate, isAlive, isOutside, judgeSurvivor, type SurvivalState } from '../../engine/survival'
import { COLLISION, FLOOR_Y, JUMPER, PLAYER_SIZE, SCROLL, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { createHazards, hazardHit, type HazardState, stepHazards } from './hazards'
import { createStage, extendStage, type StageGen } from './stage'

// 雲のぼりの1コマを進める純粋な関数（React・Canvas・通信には触らない）
// 1. 縦スクロールを進める（カメラが上がる）
// 2. 画面の少し上まで雲を足す
// 3. 生きている人だけを動かす（キャラの物理 → 雲に乗る → キャラどうしの当たり判定 → 画面の上端で止める）
// 4. 雷・鳥を進める（出す・消す）
// 5. 画面の下に置いていかれた人、雷・鳥に当たった人を脱落させる
// 6. 最後の1人になったら終わり

export type Climber = Jumper & { playerId: string }

export type CloudState = {
  scroll: ScrollState // elapsed がゲーム開始からの秒数
  climbers: Climber[]
  platforms: Platform[]
  gen: StageGen
  hazards: HazardState
  survival: SurvivalState
  finished: boolean
  winners: string[] // 勝った人（finished になってから入る。複数なら引き分け）
}

export type CloudInputs = Record<string, JumperInput>

const GENERATE_AHEAD = 300
const KEEP_BELOW = 100 // 画面の下端よりこれだけ下の雲は、もう誰も乗れないので捨てる

export function createCloudState(playerIds: string[], seed: number): CloudState {
  const stage = createStage(seed)
  const { gen, added } = extendStage(stage.gen, -GENERATE_AHEAD)
  const span = STAGE_WIDTH - WALL_WIDTH * 2
  const climbers = playerIds.map((playerId, i) => {
    const cx = WALL_WIDTH + (span * (i + 1)) / (playerIds.length + 1)
    return { ...createJumper(cx - PLAYER_SIZE / 2, FLOOR_Y - PLAYER_SIZE, PLAYER_SIZE), standingOn: 'floor', playerId }
  })
  return {
    scroll: createScroll(SCROLL),
    climbers,
    platforms: [...stage.platforms, ...added],
    gen,
    hazards: createHazards(seed ^ 0x5bd1e995),
    survival: createSurvival(playerIds),
    finished: false,
    winners: [],
  }
}

// 画面に映っているワールド座標の上端
export function cameraTop(state: CloudState): number {
  return visibleRange(SCROLL, state.scroll, STAGE_HEIGHT).from
}

export function step(state: CloudState, inputs: CloudInputs, dt: number): CloudState {
  if (state.finished) return state

  const scroll = stepScroll(state.scroll, SCROLL, dt)
  const top = visibleRange(SCROLL, scroll, STAGE_HEIGHT).from
  const { gen, added } = extendStage(state.gen, top - GENERATE_AHEAD)
  const platforms = [...state.platforms.filter((p) => p.y < top + STAGE_HEIGHT + KEEP_BELOW), ...added]

  const moved = state.climbers.map((c) => {
    if (!isAlive(state.survival, c.playerId)) return c
    const m = moveJumper(c, inputs[c.playerId], dt, JUMPER)
    return { ...m, ...updateOnPlatforms(c, m, platforms, platforms) }
  })
  const aliveBefore = state.climbers.filter((c) => isAlive(state.survival, c.playerId))
  const resolved = new Map(
    resolveJumperCollisions(
      aliveBefore,
      aliveBefore.map((c) => moved.find((m) => m.playerId === c.playerId)!),
      COLLISION,
    ).map((c) => [c.playerId, c]),
  )
  const climbers = moved.map((c) => {
    const landed = resolved.get(c.playerId) ?? c
    // 画面の上端より上へは行けない（見えない天井で止める）
    if (landed.y < top) return { ...landed, y: top, vy: Math.max(landed.vy, 0) }
    return landed
  })

  const next: CloudState = { ...state, scroll, climbers, platforms, gen }
  const alive = climbers.filter((c) => isAlive(state.survival, c.playerId))
  const screenOf = (c: Climber) => ({ ...toScreen(SCROLL, scroll, c.x, c.y), width: c.width, height: c.height })
  const targets = alive.map((c) => {
    const s = screenOf(c)
    return { x: s.x + s.width / 2, y: s.y + s.height / 2 }
  })
  const hazards = stepHazards(state.hazards, scroll.elapsed, targets)

  let survival = state.survival
  const view = { x: 0, y: 0, width: STAGE_WIDTH, height: STAGE_HEIGHT }
  for (const c of alive) {
    const s = screenOf(c)
    const cause = hazardHit(hazards, scroll.elapsed, s) ?? (isOutside(s, view) ? 'fall' : null)
    if (cause) survival = eliminate(survival, [c.playerId], scroll.elapsed, cause)
  }

  const result = judgeSurvivor(survival)
  return { ...next, hazards, survival, finished: result.decided, winners: result.winners }
}
