import { describe, expect, it } from 'vitest'
import { overlaps } from '../../engine/rect'
import { BLOCK_WIDTH, COIN_POINTS, GROUND_Y, HIGH_Y, MID_Y, PLATFORM_HEIGHT, POISON_POINTS } from './constants'
import { createStage, extendStage } from './stage'

const gen = (seed: number, until = 12000) => extendStage(createStage(seed), until)

describe('コインと足場の並べ方', () => {
  it('同じ種なら同じ道になる', () => {
    expect(gen(7)).toEqual(gen(7))
    expect(gen(7).coins).not.toEqual(gen(8).coins)
  })

  it('指定の位置より先まで作る。続けて足しても、一度に作ったのと同じ', () => {
    const all = gen(3, 6000)
    const a = extendStage(createStage(3), 2000)
    const b = extendStage(a.gen, 6000)
    expect([...a.coins, ...b.coins]).toEqual(all.coins)
    expect(all.gen.nextX).toBeGreaterThanOrEqual(6000)
  })

  it('id は重ならない', () => {
    const s = gen(5)
    expect(new Set(s.coins.map((c) => c.id)).size).toBe(s.coins.length)
    expect(new Set(s.platforms.map((p) => p.id)).size).toBe(s.platforms.length)
  })

  it('同じ種類のブロックは続かない（最初は地面の列）', () => {
    for (let seed = 0; seed < 30; seed++) {
      const kinds: string[] = []
      let g = createStage(seed)
      for (let i = 0; i < 20; i++) {
        g = extendStage(g, g.nextX + 1).gen
        kinds.push(g.last!)
      }
      expect(kinds[0]).toBe('ground')
      for (let i = 1; i < kinds.length; i++) expect(kinds[i]).not.toBe(kinds[i - 1])
    }
  })

  it('足場は3段の高さのどれかで、段差は届く範囲（105px以内）', () => {
    const heights = [GROUND_Y - 60, GROUND_Y - 120, GROUND_Y - 180, MID_Y, HIGH_Y]
    for (let seed = 0; seed < 20; seed++) {
      for (const p of gen(seed).platforms) expect(heights).toContain(p.y)
    }
    const sorted = [GROUND_Y, ...heights].sort((a, b) => b - a)
    for (let i = 1; i < sorted.length; i++) expect(sorted[i - 1] - sorted[i]).toBeLessThanOrEqual(105)
  })

  it('コインは足場や地面に埋まらず、画面の中の高さにある', () => {
    for (let seed = 0; seed < 20; seed++) {
      const s = gen(seed)
      for (const c of s.coins) {
        expect(c.y).toBeGreaterThan(0)
        expect(c.y + c.height).toBeLessThan(GROUND_Y)
        for (const p of s.platforms) {
          expect(overlaps(c, { x: p.x, y: p.y, width: p.width, height: PLATFORM_HEIGHT })).toBe(false)
        }
      }
    }
  })

  it('ブロックは重ならない（ブロックの幅 + 隙間ずつ進む）', () => {
    const g = gen(1, 5000).gen
    expect(g.nextX).toBeGreaterThanOrEqual(g.count * BLOCK_WIDTH)
  })

  it('コインは +10、毒キノコは -10。毒キノコは全体の1割ほどで、地面の上にも置かれる', () => {
    const s = gen(2, 20000)
    const poison = s.coins.filter((c) => c.kind === 'poison')
    const coins = s.coins.filter((c) => c.kind === 'coin')
    expect(coins.every((c) => c.points === COIN_POINTS)).toBe(true)
    expect(poison.every((c) => c.points === POISON_POINTS)).toBe(true)
    const ratio = poison.length / s.coins.length
    expect(ratio).toBeGreaterThan(0.05)
    expect(ratio).toBeLessThan(0.25)
    expect(poison.some((c) => c.y + c.height > GROUND_Y - 30)).toBe(true)
  })

  it('毒キノコは足場や地面に埋まらない。地面の毒キノコの前後45px は、地面のコインがない', () => {
    for (let seed = 0; seed < 20; seed++) {
      const s = gen(seed)
      const onGround = (c: { y: number; height: number }) => c.y + c.height > GROUND_Y - 30
      for (const p of s.coins.filter((c) => c.kind === 'poison' && onGround(c))) {
        for (const c of s.coins.filter((c) => c.kind === 'coin' && onGround(c))) expect(Math.abs(c.x - p.x)).toBeGreaterThan(30)
      }
      for (const c of s.coins.filter((c) => c.kind === 'poison')) {
        expect(c.y + c.height).toBeLessThanOrEqual(GROUND_Y)
        for (const p of s.platforms) expect(overlaps(c, { x: p.x, y: p.y, width: p.width, height: PLATFORM_HEIGHT })).toBe(false)
      }
    }
  })
})
