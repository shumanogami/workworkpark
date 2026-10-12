import { createJumper, type Jumper, type JumperInput, moveJumper } from '../../engine/jumper'
import { carryRiders } from '../../engine/carry'
import { resolveJumperCollisions } from '../../engine/jumperCollisions'
import { type Platform, updateOnPlatforms } from '../../engine/platforms'
import { createSurvival, eliminate, type Hazard, isAlive, judgeSurvivor, type SurvivalState, touchingHazards } from '../../engine/survival'
import {
  COLLISION,
  GROUND_Y,
  JUMPER,
  MAGMA_Y,
  MIN_START_WIDTH,
  PLATFORM_HEIGHT,
  PLAYER_SIZE,
  SHRINK_DELAY,
  SHRINK_SPEED,
  START_WIDTH_BASE,
  START_WIDTH_PER_PLAYER,
  STAGE_WIDTH,
} from './constants'

// おしくらまんじゅうの1コマを進める純粋な関数（React・Canvas・通信には触らない）
// 1. 足場を両端から狭める
// 2. 生きている人だけを動かす（キャラの物理 → 足場に乗る → キャラどうしの当たり判定）
// 3. マグマに触れた人（足場から落ちた人）を脱落させる
// 4. 最後の1人になったら終わり（同時に落ちたら引き分け）

export type Runner = Jumper & { playerId: string }

export type PushOutState = {
  elapsed: number
  runners: Runner[]
  platform: Platform
  survival: SurvivalState
  finished: boolean
  winners: string[]
}

export type PushOutInputs = Record<string, JumperInput>

export function startWidth(playerCount: number): number {
  return Math.min(Math.max(START_WIDTH_BASE + START_WIDTH_PER_PLAYER * playerCount, MIN_START_WIDTH), STAGE_WIDTH - 200)
}

// 時刻 t の足場の幅（SHRINK_DELAY までは広いまま。そのあと一定の速さで狭まり、0 未満にはならない）
export function platformWidth(playerCount: number, t: number): number {
  return Math.max(0, startWidth(playerCount) - Math.max(0, t - SHRINK_DELAY) * SHRINK_SPEED)
}

function platformAt(playerCount: number, t: number): Platform {
  const width = platformWidth(playerCount, t)
  return { id: 'ground', x: (STAGE_WIDTH - width) / 2, y: GROUND_Y, width, height: PLATFORM_HEIGHT }
}

export function createPushOutState(playerIds: string[]): PushOutState {
  const platform = platformAt(playerIds.length, 0)
  const runners = playerIds.map((playerId, i) => {
    // 端に近すぎる位置から始まらないよう、足場の中央7割に等間隔で並べる
    const span = platform.width * 0.7
    const cx = platform.x + platform.width * 0.15 + (span * (i + 1)) / (playerIds.length + 1)
    return { ...createJumper(cx - PLAYER_SIZE / 2, GROUND_Y - PLAYER_SIZE, PLAYER_SIZE), standingOn: 'ground', playerId }
  })
  return { elapsed: 0, runners, platform, survival: createSurvival(playerIds), finished: false, winners: [] }
}

// 足場が狭まっている最中か（見た目の点滅用）
export function isShrinking(state: PushOutState): boolean {
  return state.elapsed >= SHRINK_DELAY && state.platform.width > 0
}

export function step(state: PushOutState, inputs: PushOutInputs, dt: number): PushOutState {
  if (state.finished) return state
  const elapsed = state.elapsed + dt
  const platform = platformAt(state.runners.length, elapsed)

  // 生きている人だけを動かす
  const moved = state.runners.map((r) => {
    if (!isAlive(state.survival, r.playerId)) return r
    const m = moveJumper(r, inputs[r.playerId], dt, JUMPER)
    return { ...m, ...updateOnPlatforms(r, m, [state.platform], [platform]) }
  })
  // 頭の上に乗っている人は、下の人が横に動いた分だけ一緒に運ぶ（Jump the highest と同じ。3段重ねでも一番上まで伝わる）
  const aliveBefore = state.runners.filter((r) => isAlive(state.survival, r.playerId))
  const carried = carryRiders(
    aliveBefore,
    aliveBefore.map((r) => moved.find((m) => m.playerId === r.playerId)!),
    JUMPER.minX,
    JUMPER.maxX,
  )
  const resolved = new Map(resolveJumperCollisions(aliveBefore, carried, COLLISION).map((r) => [r.playerId, r]))
  const runners = moved.map((r) => resolved.get(r.playerId) ?? r)

  // 足場の外に落ちて、マグマの表面より下に体の底が入った人は脱落
  const magma: Hazard = { id: 'magma', x: 0, y: MAGMA_Y + 4, width: STAGE_WIDTH, height: 1e6, cause: 'lava' }
  let survival = state.survival
  for (const r of runners) {
    if (!isAlive(survival, r.playerId)) continue
    for (const hit of touchingHazards([r], [magma])) survival = eliminate(survival, [hit.playerId], elapsed, hit.cause)
  }
  const result = judgeSurvivor(survival)
  return { elapsed, runners, platform, survival, finished: result.decided, winners: result.winners }
}
