import { describe, expect, it } from 'vitest'
import {
  boltHitRect,
  hitRect,
  OBJECT_SIZE,
  padRows,
  squeezeRows,
  THUNDER_STRIKE_SECONDS,
  THUNDER_WARNING_SECONDS,
  thunderPhase,
} from './objects'

describe('物の大きさと当たり判定', () => {
  it('当たり判定の枠は、見た目の大きさの中に収まっている', () => {
    for (const kind of ['coin', 'poison', 'bird'] as const) {
      const s = OBJECT_SIZE[kind]
      const r = hitRect(kind, 0, 0)
      expect(r.x).toBeGreaterThanOrEqual(0)
      expect(r.y).toBeGreaterThanOrEqual(0)
      expect(r.x + r.width).toBeLessThanOrEqual(s.width)
      expect(r.y + r.height).toBeLessThanOrEqual(s.height)
    }
  })

  it('当たり判定の枠は、物の位置に合わせて動く', () => {
    expect(hitRect('coin', 100, 50)).toEqual({ x: 102, y: 52, width: 20, height: 20 })
  })

  it('雷の柱の当たり判定は、柱の幅より少し細く、縦は落ちる範囲いっぱい', () => {
    const r = boltHitRect(100, 20, 300)
    expect(r.width).toBeLessThan(OBJECT_SIZE.bolt.width)
    expect(r.y).toBe(20)
    expect(r.height).toBe(280)
  })
})

describe('雷の時間割', () => {
  it('鳴り始める前は idle、予告のあいだは warning、そのあと strike、終わると idle', () => {
    const end = THUNDER_WARNING_SECONDS + THUNDER_STRIKE_SECONDS
    expect(thunderPhase(0, -0.1)).toBe('idle')
    expect(thunderPhase(0, 0)).toBe('warning')
    expect(thunderPhase(0, THUNDER_WARNING_SECONDS - 0.01)).toBe('warning')
    expect(thunderPhase(0, THUNDER_WARNING_SECONDS)).toBe('strike')
    expect(thunderPhase(0, end - 0.01)).toBe('strike')
    expect(thunderPhase(0, end)).toBe('idle')
  })

  it('予告のあいだは当たらない（よける時間がある）：予告は 0.5 秒以上', () => {
    expect(THUNDER_WARNING_SECONDS).toBeGreaterThanOrEqual(0.5)
  })
})

describe('ドット絵の升目', () => {
  it('padRows は、右が足りない行を指定の幅にそろえる', () => {
    expect(padRows(['AB', ''], 4)).toEqual(['AB..', '....'])
  })

  it('squeezeRows は、左右対称の絵を細くしても行の数は変わらず、幅だけ変わる', () => {
    const rows = ['..OO..', '.OYYO.', 'OYYYYO']
    const thin = squeezeRows(rows, 3)
    expect(thin).toHaveLength(3)
    expect(thin.every((r) => r.length === 3)).toBe(true)
  })
})
