import { describe, expect, it } from 'vitest'
import { PLAYER_SIZE, STAGE_HEIGHT, STAGE_WIDTH } from './game/constants'
import { SPRITE_SIZE } from './game/sprite'
import { MAX_PLAYERS } from './lib/players'
import { colors, layout, playerColors } from './theme'

// 大きさの値は src/game/constants.ts（物理）と sprite.ts（ドット絵）にもあるため、食い違ったら気づけるようにする
describe('layout', () => {
  it('物理の座標は 480×270 のドットの升目のちょうど整数倍', () => {
    expect(STAGE_WIDTH).toBe(layout.logicalWidth * layout.stagePxPerDot)
    expect(STAGE_HEIGHT).toBe(layout.logicalHeight * layout.stagePxPerDot)
  })

  it('キャラクターは 1ドット＝1マスで描かれる', () => {
    expect(SPRITE_SIZE).toBe(layout.characterDots)
    expect(PLAYER_SIZE).toBe(layout.characterDots * layout.stagePxPerDot)
  })
})

describe('playerColors', () => {
  it('最大人数分の色があり、すべて違う色', () => {
    expect(playerColors).toHaveLength(MAX_PLAYERS)
    expect(new Set(playerColors).size).toBe(MAX_PLAYERS)
  })

  it('背景・演出の色と同じ色を使わない（キャラが背景に溶けないように）', () => {
    const background = [
      colors.sky.main,
      colors.cloud.main,
      colors.cloud.shadow,
      colors.sun.main,
      colors.sun.ray,
      colors.grass.main,
      colors.dirt.main,
      colors.wall.main,
      colors.ui.finish,
    ]
    for (const c of playerColors) expect(background).not.toContain(c)
  })
})
