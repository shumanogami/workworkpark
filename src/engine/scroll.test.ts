import { describe, expect, it } from 'vitest'
import {
  createScroll,
  DEFAULT_HORIZONTAL,
  DEFAULT_VERTICAL,
  offsetAt,
  type ScrollConfig,
  speedAt,
  stepScroll,
  toScreen,
  topSpeed,
  visibleRange,
  wrapOffset,
} from './scroll'

// 1段階だけの設定（60 から 1秒に15ずつ速くなり、300 で頭打ち）
const config: ScrollConfig = {
  axis: 'horizontal',
  direction: 1,
  initialSpeed: 60,
  phases: [{ acceleration: 15, maxSpeed: 300 }],
}

describe('speedAt（時間とともに速くなる）', () => {
  it('始まりは初速、1秒ごとに加速度の分だけ速くなる', () => {
    expect(speedAt(config, 0)).toBe(60)
    expect(speedAt(config, 1)).toBe(75)
    expect(speedAt(config, 10)).toBe(210)
  })

  it('最高速度で頭打ちになる（60 + 15×16 = 300）', () => {
    expect(speedAt(config, 16)).toBe(300)
    expect(speedAt(config, 100)).toBe(300)
  })
})

describe('offsetAt（進んだ距離）', () => {
  it('加速中は 初速×t + 加速度×t²/2', () => {
    expect(offsetAt(config, 2)).toBeCloseTo(60 * 2 + (15 * 4) / 2)
  })

  it('最高速度に届いた後は、最高速度で進む', () => {
    const atMax = offsetAt(config, 16)
    expect(offsetAt(config, 20) - atMax).toBeCloseTo(300 * 4)
  })

  it('加速しない設定なら一定の速さで進む', () => {
    expect(offsetAt({ ...config, phases: [] }, 10)).toBeCloseTo(600)
  })
})

describe('段階ごとの加速（横・縦の初期設定）', () => {
  it('横：16秒で300まではそれまでどおり、そこから急に加速して20秒で500、その後は500のまま', () => {
    expect(speedAt(DEFAULT_HORIZONTAL, 8)).toBeCloseTo(180) // 1段目（1秒に15ずつ）
    expect(speedAt(DEFAULT_HORIZONTAL, 16)).toBeCloseTo(300)
    expect(speedAt(DEFAULT_HORIZONTAL, 18)).toBeCloseTo(400) // 2段目（1秒に50ずつ）
    expect(speedAt(DEFAULT_HORIZONTAL, 20)).toBeCloseTo(500)
    expect(speedAt(DEFAULT_HORIZONTAL, 60)).toBe(500)
    expect(topSpeed(DEFAULT_HORIZONTAL)).toBe(500)
  })

  it('縦：16秒で200まではそれまでどおり、そこから急に加速して20秒で1200', () => {
    expect(speedAt(DEFAULT_VERTICAL, 16)).toBeCloseTo(200)
    expect(speedAt(DEFAULT_VERTICAL, 20)).toBeCloseTo(1200)
    expect(speedAt(DEFAULT_VERTICAL, 60)).toBe(1200)
  })

  it('段階の切り替わりで、進んだ距離が飛んだりしない（速さの積み重ねと一致する）', () => {
    let sum = 0
    const steps = 25 * 600
    const dt = 25 / steps
    // 小数の足し算で回数がずれないよう、回数で回す
    for (let i = 0; i < steps; i++) sum += speedAt(DEFAULT_HORIZONTAL, (i + 0.5) * dt) * dt
    expect(offsetAt(DEFAULT_HORIZONTAL, 25)).toBeCloseTo(sum, 0)
  })

  it('すでに超えている上限や、加速しない段階は飛ばす', () => {
    const c: ScrollConfig = {
      ...config,
      phases: [
        { acceleration: 15, maxSpeed: 30 }, // 初速 60 より低い上限
        { acceleration: 0, maxSpeed: 1000 }, // 加速しない
        { acceleration: 10, maxSpeed: 100 },
      ],
    }
    expect(speedAt(c, 2)).toBeCloseTo(80)
    expect(topSpeed(c)).toBe(100)
  })
})

describe('stepScroll', () => {
  it('1/60秒ずつ進めても、まとめて進めても同じ距離になる', () => {
    let s = createScroll(config)
    for (let i = 0; i < 60 * 20; i++) s = stepScroll(s, config, 1 / 60)
    expect(s.offset).toBeCloseTo(offsetAt(config, 20), 3)
    expect(s.speed).toBeCloseTo(300)
  })

  it('進む距離は増え続ける（止まったり戻ったりしない）', () => {
    let s = createScroll(DEFAULT_VERTICAL)
    let prev = s.offset
    for (let i = 0; i < 600; i++) {
      s = stepScroll(s, DEFAULT_VERTICAL, 1 / 60)
      expect(s.offset).toBeGreaterThan(prev)
      prev = s.offset
    }
  })
})

describe('toScreen（ワールド座標 → 画面座標）', () => {
  const state = { elapsed: 0, speed: 0, offset: 100 }

  it('右へ進む横スクロールでは、世界は左へずれて見える', () => {
    expect(toScreen(DEFAULT_HORIZONTAL, state, 500, 200)).toEqual({ x: 400, y: 200 })
  })

  it('左へ進む横スクロールでは、世界は右へずれて見える', () => {
    expect(toScreen({ ...DEFAULT_HORIZONTAL, direction: -1 }, state, 500, 200)).toEqual({ x: 600, y: 200 })
  })

  it('上へ進む縦スクロールでは、世界は下へずれて見える', () => {
    expect(toScreen(DEFAULT_VERTICAL, state, 500, 200)).toEqual({ x: 500, y: 300 })
  })
})

describe('visibleRange（画面に入っている範囲）', () => {
  const state = { elapsed: 0, speed: 0, offset: 100 }

  it('横：右へ100進んだら、ワールドの x=100〜1060 が見えている', () => {
    expect(visibleRange(DEFAULT_HORIZONTAL, state, 960)).toEqual({ from: 100, to: 1060 })
  })

  it('縦：上へ100進んだら、ワールドの y=-100〜440 が見えている', () => {
    expect(visibleRange(DEFAULT_VERTICAL, state, 540)).toEqual({ from: -100, to: 440 })
  })

  it('見えている範囲の端は、画面の端に写る', () => {
    const r = visibleRange(DEFAULT_VERTICAL, state, 540)
    expect(toScreen(DEFAULT_VERTICAL, state, 0, r.from).y).toBe(0)
  })
})

describe('wrapOffset（くり返し模様のずらし量）', () => {
  it('0 以上 タイルの大きさ未満になる', () => {
    expect(wrapOffset(250, 100)).toBe(50)
    expect(wrapOffset(-30, 100)).toBe(70)
    expect(wrapOffset(0, 100)).toBe(0)
  })
})
