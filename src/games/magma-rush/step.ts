import { createJumper, type Jumper, type JumperInput, moveJumper } from '../../engine/jumper'
import { type Platform, updateOnPlatforms } from '../../engine/platforms'
import { createScroll, type ScrollState, stepScroll, visibleRange } from '../../engine/scroll'
import {
  createSurvival,
  eliminate,
  type Hazard,
  isAlive,
  judgeSurvivor,
  type SurvivalState,
  touchingHazards,
} from '../../engine/survival'
import {
  FLOOR_Y,
  JUMPER,
  MAGMA_DEPTH_MAX,
  MAGMA_DEPTH_SECONDS,
  MAGMA_DEPTH_START,
  PLAYER_SIZE,
  SCROLL,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  WALL_WIDTH,
} from './constants'
import { createStage, extendStage, type StageGen } from './stage'

// マグマラッシュの1コマを進める純粋な関数（React・Canvas・通信には触らない）
// 1. 縦スクロールを進める（カメラが上がる。マグマはカメラの下端にくっついて一緒に上がる）
// 2. 画面の少し上まで足場を足す
// 3. 生きている人だけを動かす（キャラの物理 → 足場に乗る → 画面の上端で止める）
// 4. マグマに触れた人を脱落させる。足場から落ちた人も、マグマに沈んで脱落する
// 5. 最後の1人になったら終わり（finished）

export type Runner = Jumper & { playerId: string }

export type MagmaState = {
  scroll: ScrollState // elapsed がゲーム開始からの秒数
  runners: Runner[]
  platforms: Platform[]
  gen: StageGen
  survival: SurvivalState
  finished: boolean
  winners: string[] // 勝った人（finished になってから入る。複数なら引き分け）
}

export type MagmaInputs = Record<string, JumperInput>

const GENERATE_AHEAD = 300 // 画面の上端よりこれだけ上まで、足場を先に作っておく
const KEEP_BELOW = 200 // 画面の下端よりこれだけ下の足場は、もう誰も乗れない（マグマの中）ので捨てる

export function createMagmaState(playerIds: string[], seed: number): MagmaState {
  const stage = createStage(seed)
  const scroll = createScroll(SCROLL)
  const { gen, added } = extendStage(stage.gen, -GENERATE_AHEAD)
  // スタートの岩場に、間を空けて横に並べる（8人でも重ならない）
  const span = STAGE_WIDTH - WALL_WIDTH * 2
  const runners = playerIds.map((playerId, i) => {
    const cx = WALL_WIDTH + (span * (i + 1)) / (playerIds.length + 1)
    return { ...createJumper(cx - PLAYER_SIZE / 2, FLOOR_Y - PLAYER_SIZE, PLAYER_SIZE), standingOn: 'floor', playerId }
  })
  return {
    scroll,
    runners,
    platforms: [...stage.platforms, ...added],
    gen,
    survival: createSurvival(playerIds),
    finished: false,
    winners: [],
  }
}

// 画面に映っているワールド座標の上端
export function cameraTop(state: MagmaState): number {
  return visibleRange(SCROLL, state.scroll, STAGE_HEIGHT).from
}

// マグマの表面が画面の下端から何ピクセル上にあるか
export function magmaDepth(elapsed: number): number {
  const t = Math.min(Math.max(elapsed / MAGMA_DEPTH_SECONDS, 0), 1)
  return MAGMA_DEPTH_START + (MAGMA_DEPTH_MAX - MAGMA_DEPTH_START) * t
}

// マグマの表面のワールド座標の y
export function magmaTop(state: MagmaState): number {
  return cameraTop(state) + STAGE_HEIGHT - magmaDepth(state.scroll.elapsed)
}

export function step(state: MagmaState, inputs: MagmaInputs, dt: number): MagmaState {
  if (state.finished) return state

  const scroll = stepScroll(state.scroll, SCROLL, dt)
  const top = visibleRange(SCROLL, scroll, STAGE_HEIGHT).from
  const { gen, added } = extendStage(state.gen, top - GENERATE_AHEAD)
  const platforms = [...state.platforms.filter((p) => p.y < top + STAGE_HEIGHT + KEEP_BELOW), ...added]

  const runners = state.runners.map((r) => {
    if (!isAlive(state.survival, r.playerId)) return r // 脱落した人は動かさない・入力を受け付けない
    const moved = moveJumper(r, inputs[r.playerId], dt, JUMPER)
    const landed = { ...moved, ...updateOnPlatforms(r, moved, platforms, platforms) }
    // 画面の上端より上へは行けない（画面に映らなくなるため、見えない天井で止める）
    if (landed.y < top) return { ...landed, y: top, vy: Math.max(landed.vy, 0) }
    return landed
  })

  const next: MagmaState = { ...state, scroll, runners, platforms, gen }
  const magma: Hazard = { id: 'magma', x: 0, y: magmaTop(next), width: STAGE_WIDTH, height: 1e6, cause: 'lava' }
  const alive = runners.filter((r) => isAlive(state.survival, r.playerId))
  let survival = state.survival
  for (const hit of touchingHazards(alive, [magma])) {
    survival = eliminate(survival, [hit.playerId], scroll.elapsed, hit.cause)
  }

  const result = judgeSurvivor(survival)
  return { ...next, survival, finished: result.decided, winners: result.winners }
}
