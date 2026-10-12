import { boltHitRect, hitRect, OBJECT_SIZE, THUNDER_STRIKE_SECONDS, THUNDER_WARNING_SECONDS, thunderPhase } from '../../engine/objects'
import {
  BIRD_SHARE,
  BIRD_SPEED,
  BIRD_WARNING_SECONDS,
  FIRST_HAZARD_AT,
  HAZARD_INTERVAL,
  HAZARD_INTERVAL_SECONDS,
  HIT_INSET,
  MAX_ACTIVE_HAZARDS,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  THUNDER_JITTER,
} from './constants'
import { nextRandom } from './stage'

// 雷と鳥の出し方。画面・音には触らない純粋な関数
// 雷も鳥も「画面に固定」の座標（スクロールで流れない）で持つ。予告の位置と当たる位置がずれないようにするため
// どちらも予告（0.8秒）のあいだは当たらない。予告を見てから動けば必ずよけられる

type Rect = { x: number; y: number; width: number; height: number }

export type Thunder = { id: number; x: number; startedAt: number } // x は柱の左端（画面の x）。柱は画面の上から下まで
export type Bird = { id: number; y: number; dir: 1 | -1; startedAt: number } // y は鳥の見た目の上端（画面の y）。dir 1：右へ飛ぶ

export type HazardState = {
  rng: number
  nextAt: number // 次の雷・鳥が出る時刻（ゲーム開始からの秒）
  nextId: number
  thunders: Thunder[]
  birds: Bird[]
}

// 狙われる人の位置（画面の座標。体の中心）
export type Target = { x: number; y: number }

export const THUNDER_TOTAL = THUNDER_WARNING_SECONDS + THUNDER_STRIKE_SECONDS
const BIRD_W = OBJECT_SIZE.bird.width
const BIRD_H = OBJECT_SIZE.bird.height

export function createHazards(seed: number): HazardState {
  return { rng: seed, nextAt: FIRST_HAZARD_AT, nextId: 1, thunders: [], birds: [] }
}

// 鳥の位置（画面の座標）と段階。warning の間は画面の端で「!」だけ出て、当たらない
export function birdPosition(b: Bird, now: number): { x: number; y: number; phase: 'warning' | 'flying' } {
  const flown = now - b.startedAt - BIRD_WARNING_SECONDS
  const startX = b.dir > 0 ? -BIRD_W : STAGE_WIDTH
  return { x: startX + b.dir * Math.max(flown, 0) * BIRD_SPEED, y: b.y, phase: flown < 0 ? 'warning' : 'flying' }
}

function birdGone(b: Bird, now: number): boolean {
  const p = birdPosition(b, now)
  return p.phase === 'flying' && (b.dir > 0 ? p.x > STAGE_WIDTH : p.x < -BIRD_W)
}

// 時刻 now（秒）まで進めた次の状態。targets は生きている人の位置。誰もいなければ新しくは出さない
export function stepHazards(state: HazardState, now: number, targets: Target[]): HazardState {
  const thunders = state.thunders.filter((t) => now - t.startedAt < THUNDER_TOTAL)
  const birds = state.birds.filter((b) => !birdGone(b, now))
  const base = { ...state, thunders, birds }
  if (now < state.nextAt || targets.length === 0) return base
  if (thunders.length + birds.length >= MAX_ACTIVE_HAZARDS) return { ...base, nextAt: now + 0.5 } // いっぱいなら少し待つ

  let rng = state.rng
  const rand = () => {
    const [v, s] = nextRandom(rng)
    rng = s
    return v
  }
  const target = targets[Math.floor(rand() * targets.length)]
  const progress = Math.min(Math.max(now / HAZARD_INTERVAL_SECONDS, 0), 1)
  const interval = (HAZARD_INTERVAL.start + (HAZARD_INTERVAL.end - HAZARD_INTERVAL.start) * progress) * (0.7 + rand() * 0.6)
  const next = { ...base, nextAt: now + interval, nextId: state.nextId + 1 }
  if (rand() >= BIRD_SHARE) {
    // 雷：狙った人の近くの柱。少しずらすので、真上に立っていれば動いてよける
    const w = OBJECT_SIZE.bolt.width
    const x = Math.round(Math.min(Math.max(target.x - w / 2 + (rand() * 2 - 1) * THUNDER_JITTER, 0), STAGE_WIDTH - w))
    return { ...next, rng, thunders: [...thunders, { id: state.nextId, x, startedAt: now }] }
  }
  // 鳥：狙った人の体の高さを横切る。ジャンプで越えるか、くぐるか、タイミングを待つ
  const y = Math.round(Math.min(Math.max(target.y - BIRD_H / 2, 0), STAGE_HEIGHT - BIRD_H))
  const dir: 1 | -1 = rand() < 0.5 ? 1 : -1
  return { ...next, rng, birds: [...birds, { id: state.nextId, y, dir, startedAt: now }] }
}

// 雷・鳥に当たる体の枠（見た目より少し小さい）
export function bodyHitRect(body: Rect): Rect {
  return { x: body.x + HIT_INSET, y: body.y + HIT_INSET, width: body.width - HIT_INSET * 2, height: body.height - HIT_INSET * 2 }
}

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
}

// 体（画面の座標）が、今当たる雷・鳥に触れているか。触れていれば原因（'thunder' か 'bird'）
export function hazardHit(state: HazardState, now: number, body: Rect): 'thunder' | 'bird' | null {
  const b = bodyHitRect(body)
  for (const t of state.thunders) {
    if (thunderPhase(t.startedAt, now) !== 'strike') continue
    if (overlaps(b, boltHitRect(t.x, 0, STAGE_HEIGHT))) return 'thunder'
  }
  for (const bird of state.birds) {
    const p = birdPosition(bird, now)
    if (p.phase === 'flying' && overlaps(b, hitRect('bird', p.x, p.y))) return 'bird'
  }
  return null
}
