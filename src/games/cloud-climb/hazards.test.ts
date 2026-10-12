import { describe, expect, it } from 'vitest'
import { THUNDER_STRIKE_SECONDS, THUNDER_WARNING_SECONDS } from '../../engine/objects'
import { BIRD_SPEED, BIRD_WARNING_SECONDS, FIRST_HAZARD_AT, MAX_ACTIVE_HAZARDS, STAGE_WIDTH } from './constants'
import { birdPosition, createHazards, hazardHit, type HazardState, stepHazards } from './hazards'

const TARGETS = [{ x: 480, y: 300 }]
const BODY = { x: 460, y: 280, width: 40, height: 40 }

// 時刻を細かく進めて、雷・鳥を出させる
function runUntil(state: HazardState, from: number, to: number, targets = TARGETS): HazardState {
  let s = state
  for (let t = from; t <= to; t += 1 / 60) s = stepHazards(s, t, targets)
  return s
}

describe('雷と鳥の出し方', () => {
  it('最初の何秒かは何も出ない', () => {
    const s = runUntil(createHazards(1), 0, FIRST_HAZARD_AT - 0.1)
    expect(s.thunders).toEqual([])
    expect(s.birds).toEqual([])
  })

  it('始まったあとは、雷か鳥が出る。同時に出る数には上限がある', () => {
    let s = createHazards(1)
    let maxActive = 0
    let any = false
    for (let t = 0; t < 30; t += 1 / 60) {
      s = stepHazards(s, t, TARGETS)
      maxActive = Math.max(maxActive, s.thunders.length + s.birds.length)
      if (s.thunders.length + s.birds.length > 0) any = true
    }
    expect(any).toBe(true)
    expect(maxActive).toBeLessThanOrEqual(MAX_ACTIVE_HAZARDS)
  })

  it('誰も生きていなければ、新しく出さない', () => {
    const s = runUntil(createHazards(1), 0, 20, [])
    expect(s.thunders.length + s.birds.length).toBe(0)
  })

  it('同じ種なら同じ出方', () => {
    expect(runUntil(createHazards(7), 0, 15)).toEqual(runUntil(createHazards(7), 0, 15))
  })
})

describe('雷', () => {
  const state = (): HazardState => ({ ...createHazards(1), thunders: [{ id: 1, x: 468, startedAt: 10 }] })

  it('予告のあいだは当たらない（よけられる）', () => {
    expect(hazardHit(state(), 10 + THUNDER_WARNING_SECONDS - 0.01, BODY)).toBeNull()
  })

  it('落ちている間は、柱の中にいる人に当たる。離れていれば当たらない', () => {
    const t = 10 + THUNDER_WARNING_SECONDS + 0.1
    expect(hazardHit(state(), t, BODY)).toBe('thunder')
    expect(hazardHit(state(), t, { ...BODY, x: 100 })).toBeNull()
  })

  it('落ちたあとは消える', () => {
    const s = stepHazards(state(), 10 + THUNDER_WARNING_SECONDS + THUNDER_STRIKE_SECONDS + 0.01, [])
    expect(s.thunders).toEqual([])
  })
})

describe('鳥', () => {
  const bird = (dir: 1 | -1): HazardState => ({ ...createHazards(1), birds: [{ id: 1, y: 290, dir, startedAt: 10 }] })

  it('予告のあいだは画面の外にいて、当たらない', () => {
    expect(birdPosition(bird(1).birds[0], 10 + BIRD_WARNING_SECONDS - 0.01).phase).toBe('warning')
    expect(hazardHit(bird(1), 10 + BIRD_WARNING_SECONDS - 0.01, BODY)).toBeNull()
  })

  it('予告のあとは横切り、通り道にいる人に当たる。別の高さなら当たらない', () => {
    // 右へ飛ぶ鳥が x=470 あたりに来る時刻
    const t = 10 + BIRD_WARNING_SECONDS + (470 + 40) / BIRD_SPEED
    expect(hazardHit(bird(1), t, BODY)).toBe('bird')
    expect(hazardHit(bird(1), t, { ...BODY, y: 150 })).toBeNull()
  })

  it('左へ飛ぶ鳥は右端から出る', () => {
    expect(birdPosition(bird(-1).birds[0], 10 + BIRD_WARNING_SECONDS).x).toBeCloseTo(STAGE_WIDTH)
  })

  it('画面を出たら消える', () => {
    const s = stepHazards(bird(1), 10 + BIRD_WARNING_SECONDS + (STAGE_WIDTH + 100) / BIRD_SPEED, [])
    expect(s.birds).toEqual([])
  })
})
