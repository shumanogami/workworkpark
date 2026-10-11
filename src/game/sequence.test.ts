import { describe, expect, it } from 'vitest'
import { PLAYER_SIZE } from './constants'
import {
  BAR_RISE_SECONDS,
  COUNTDOWN_SECONDS,
  countdownBeat,
  countdownLabel,
  FINISH_ONLY_SECONDS,
  FINISH_TOTAL_SECONDS,
  finishView,
  highestHead,
  START_LABEL_SECONDS,
} from './sequence'
import { createInitialState } from './state'

describe('countdownLabel', () => {
  it('1秒ごとに 3 → 2 → 1 → START! と変わり、その後は消える', () => {
    expect(countdownLabel(0)).toBe('3')
    expect(countdownLabel(0.99)).toBe('3')
    expect(countdownLabel(1)).toBe('2')
    expect(countdownLabel(2.5)).toBe('1')
    expect(countdownLabel(COUNTDOWN_SECONDS)).toBe('START!')
    expect(countdownLabel(COUNTDOWN_SECONDS + START_LABEL_SECONDS)).toBeNull()
  })
})

describe('countdownBeat', () => {
  it('3・2・1 が出た瞬間に tick、START! が出た瞬間に go が1回ずつ', () => {
    const beats: string[] = []
    let prev: number | null = null
    for (let t = 0; t < 5; t += 1 / 60) {
      const b = countdownBeat(prev, t)
      if (b) beats.push(b)
      prev = t
    }
    expect(beats).toEqual(['tick', 'tick', 'tick', 'go'])
  })
})

describe('finishView', () => {
  it('最初は FINISH だけで、バーはまだ出ない', () => {
    expect(finishView(0.5, 200)).toEqual({ barHeight: null, done: false })
  })

  it('バーは地面から上がり始め、目標の高さで止まる', () => {
    const start = finishView(FINISH_ONLY_SECONDS, 200).barHeight!
    const mid = finishView(FINISH_ONLY_SECONDS + BAR_RISE_SECONDS / 2, 200).barHeight!
    const end = finishView(FINISH_ONLY_SECONDS + BAR_RISE_SECONDS, 200).barHeight!
    expect(start).toBe(0)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(200)
    expect(end).toBeCloseTo(200)
  })

  it('目標で 1.5 秒止まった後に終わる', () => {
    const holdStart = FINISH_ONLY_SECONDS + BAR_RISE_SECONDS
    expect(finishView(holdStart + 1.4, 200)).toEqual({ barHeight: 200, done: false })
    expect(finishView(FINISH_TOTAL_SECONDS, 200).done).toBe(true)
  })
})

describe('highestHead', () => {
  it('一番高い人の頭の高さ（足元＋キャラの大きさ）を返す', () => {
    const s = createInitialState([
      { playerId: 'a', color: '#fff' },
      { playerId: 'b', color: '#fff' },
    ])
    s.players[1].y = 120
    expect(highestHead(s)).toBe(120 + PLAYER_SIZE)
  })
})
