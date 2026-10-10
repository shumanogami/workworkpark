import { describe, expect, it } from 'vitest'
import { FIXED_DT, GAME_DURATION } from './constants'
import { createInitialState } from './state'
import { step } from './step'

const initial = () => createInitialState([{ playerId: 'p0', color: '#fff' }])

describe('step（時間）', () => {
  it('dt だけ時間が進む', () => {
    expect(step(initial(), {}, 0.5).elapsed).toBeCloseTo(0.5)
  })

  it('1/60秒ずつ10秒分進めると終了する', () => {
    let state = initial()
    for (let i = 0; i < GAME_DURATION / FIXED_DT + 1; i++) state = step(state, {}, FIXED_DT)
    expect(state.finished).toBe(true)
    expect(state.elapsed).toBe(GAME_DURATION)
  })

  it('終了した後は状態が変わらない', () => {
    const finished = step(initial(), {}, GAME_DURATION)
    expect(step(finished, {}, 1)).toBe(finished)
  })
})
