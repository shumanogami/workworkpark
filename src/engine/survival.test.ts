import { describe, expect, it } from 'vitest'
import {
  aliveIds,
  createSurvival,
  eliminate,
  type Hazard,
  isAlive,
  isOutside,
  judgeAtTimeUp,
  judgeSurvivor,
  onlyAlive,
  ranking,
  touchingHazards,
} from './survival'

const lava: Hazard = { id: 'lava', x: 0, y: 500, width: 960, height: 40, cause: 'lava' }
const body = (playerId: string, y: number) => ({ playerId, x: 100, y, width: 40, height: 40 })

describe('脱落', () => {
  it('危険物に触れた人を見つける。触れていない人は含まない', () => {
    expect(touchingHazards([body('a', 470), body('b', 300)], [lava])).toEqual([{ playerId: 'a', cause: 'lava' }])
  })

  it('脱落させると、生きている一覧から外れる', () => {
    const s = eliminate(createSurvival(['a', 'b', 'c']), ['b'], 3.2, 'lava')
    expect(isAlive(s, 'b')).toBe(false)
    expect(aliveIds(s)).toEqual(['a', 'c'])
    expect(s.eliminated).toEqual([{ playerId: 'b', at: 3.2, cause: 'lava' }])
  })

  it('脱落した人は、描く・操作するものから外せる', () => {
    const s = eliminate(createSurvival(['a', 'b']), ['a'], 1, 'poison')
    const inputs = [{ playerId: 'a', jump: true }, { playerId: 'b', jump: false }]
    expect(onlyAlive(s, inputs)).toEqual([{ playerId: 'b', jump: false }])
  })

  it('すでに脱落した人をもう一度脱落させても、記録は変わらない', () => {
    let s = eliminate(createSurvival(['a', 'b']), ['a'], 1, 'lava')
    s = eliminate(s, ['a'], 2, 'poison')
    expect(s.eliminated).toEqual([{ playerId: 'a', at: 1, cause: 'lava' }])
  })

  it('画面の外へ完全に出たら外。少しはみ出しただけなら外ではない', () => {
    const view = { x: 0, y: 0, width: 960, height: 540 }
    expect(isOutside({ x: 100, y: 560, width: 40, height: 40 }, view)).toBe(true) // 下へ落ちた
    expect(isOutside({ x: -30, y: 100, width: 40, height: 40 }, view)).toBe(false) // 左に少しはみ出した
    expect(isOutside({ x: -45, y: 100, width: 40, height: 40 }, view, 10)).toBe(false) // 余白の範囲
  })
})

describe('judgeSurvivor（最後まで生き残った人が勝ち）', () => {
  it('2人以上残っている間は、勝負がつかない', () => {
    const s = eliminate(createSurvival(['a', 'b', 'c']), ['a'], 1, 'lava')
    expect(judgeSurvivor(s)).toEqual({ decided: false, winners: [] })
  })

  it('残りが1人になったら、その人の勝ち', () => {
    let s = eliminate(createSurvival(['a', 'b', 'c']), ['a'], 1, 'lava')
    s = eliminate(s, ['c'], 2, 'lava')
    expect(judgeSurvivor(s)).toEqual({ decided: true, winners: ['b'] })
  })

  it('最後の2人が同時に脱落して全滅したら、その2人の引き分け', () => {
    let s = eliminate(createSurvival(['a', 'b', 'c']), ['a'], 1, 'lava')
    s = eliminate(s, ['b', 'c'], 5, 'lava')
    expect(judgeSurvivor(s)).toEqual({ decided: true, winners: ['b', 'c'] })
  })

  it('1人で始めた場合は、脱落するまで勝負がつかない', () => {
    const s = createSurvival(['a'])
    expect(judgeSurvivor(s).decided).toBe(false)
    expect(judgeSurvivor(eliminate(s, ['a'], 4, 'lava'))).toEqual({ decided: true, winners: ['a'] })
  })

  it('制限時間で終わったら、生き残っている全員の引き分け', () => {
    const s = eliminate(createSurvival(['a', 'b', 'c']), ['a'], 1, 'lava')
    expect(judgeAtTimeUp(s)).toEqual({ decided: true, winners: ['b', 'c'] })
  })
})

describe('ranking（順位）', () => {
  it('生き残りが1位、脱落が遅かった人ほど上位、同時に脱落した人は同じ順位', () => {
    let s = createSurvival(['a', 'b', 'c', 'd', 'e'])
    s = eliminate(s, ['e'], 1, 'lava')
    s = eliminate(s, ['c', 'd'], 3, 'lava')
    s = eliminate(s, ['b'], 6, 'lava')
    expect(ranking(s)).toEqual([
      { playerId: 'a', rank: 1 },
      { playerId: 'b', rank: 2 },
      { playerId: 'c', rank: 3 },
      { playerId: 'd', rank: 3 },
      { playerId: 'e', rank: 5 },
    ])
  })
})
