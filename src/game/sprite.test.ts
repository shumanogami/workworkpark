import { describe, expect, it } from 'vitest'
import { CHARACTER_SPRITE, shade, SPRITE_SIZE } from './sprite'

describe('CHARACTER_SPRITE', () => {
  it('20×20 マスで、決めた記号だけを使っている', () => {
    expect(CHARACTER_SPRITE).toHaveLength(SPRITE_SIZE)
    for (const row of CHARACTER_SPRITE) {
      expect(row).toHaveLength(SPRITE_SIZE)
      expect(row).toMatch(/^[.OBDLWKM]+$/)
    }
  })
})

describe('shade', () => {
  it('明るくすると白に、暗くすると黒に近づく', () => {
    expect(shade('#ff0000', 1)).toBe('#ffffff')
    expect(shade('#ff0000', -1)).toBe('#000000')
    expect(shade('#ff0000', 0.5)).toBe('#ff8080')
    expect(shade('#808080', 0)).toBe('#808080')
  })
})
