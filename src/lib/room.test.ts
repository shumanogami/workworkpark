import { describe, expect, it } from 'vitest'
import { generateRoomCode, normalizeRoomCode } from './room'

describe('generateRoomCode', () => {
  it('読み間違えやすい文字を含まない大文字4文字', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateRoomCode()).toMatch(/^[A-HJ-NP-Z]{4}$/)
    }
  })
})

describe('normalizeRoomCode', () => {
  it('小文字や前後の空白をそろえる', () => {
    expect(normalizeRoomCode(' abcd ')).toBe('ABCD')
  })

  it('4文字の英字でなければ null', () => {
    expect(normalizeRoomCode(null)).toBeNull()
    expect(normalizeRoomCode('ABC')).toBeNull()
    expect(normalizeRoomCode('AB12')).toBeNull()
  })
})
