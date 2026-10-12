import { describe, expect, it } from 'vitest'
import { chooseRoomCode, generateRoomCode, normalizeRoomCode } from './room'

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

describe('chooseRoomCode（PCのルームコードを決める）', () => {
  const none = { fromUrl: null, saved: null, legacy: null }
  const create = () => 'NEWW'

  it('URL で指定したコードが一番優先（保存してあるコードより先）', () => {
    expect(chooseRoomCode({ ...none, fromUrl: 'work', saved: 'SAVE' }, create)).toBe('WORK')
  })

  it('URL の指定がなければ、このPCに保存してあるコードを使う（毎回同じQRになる）', () => {
    expect(chooseRoomCode({ ...none, saved: 'SAVE', legacy: 'OLDD' }, create)).toBe('SAVE')
  })

  it('保存がなければ、以前の版でタブに保存したコードを引き継ぐ', () => {
    expect(chooseRoomCode({ ...none, legacy: 'OLDD' }, create)).toBe('OLDD')
  })

  it('どれもなければ新しく作る', () => {
    expect(chooseRoomCode(none, create)).toBe('NEWW')
  })

  it('不正な値（4文字の英字でない）は無視して、次の候補を使う', () => {
    expect(chooseRoomCode({ fromUrl: 'AB12', saved: 'TOOLONG', legacy: null }, create)).toBe('NEWW')
  })
})
