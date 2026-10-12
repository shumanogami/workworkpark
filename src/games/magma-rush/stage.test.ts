import { describe, expect, it } from 'vitest'
import { createJumper, type Jumper, moveJumper } from '../../engine/jumper'
import { type Platform, updateOnPlatforms } from '../../engine/platforms'
import { FIXED_DT, FLOOR_Y, JUMPER, MAX_EDGE_GAP, MAX_RISE, PLAYER_SIZE, STAGE_WIDTH, WALL_WIDTH } from './constants'
import { canReach, createStage, extendStage } from './stage'

// 種を変えて、たくさんのステージで確かめる
const SEEDS = Array.from({ length: 50 }, (_, i) => i * 7919 + 1)
const TOP = FLOOR_Y - 12000 // 一番難しくなる高さ（HARD_HEIGHT）よりずっと上まで

function build(seed: number): Platform[][] {
  const { gen, platforms } = createStage(seed)
  const { added } = extendStage(gen, TOP)
  const rows: Platform[][] = [platforms]
  for (const p of added) {
    const n = Number(p.id.split('-')[0].slice(1))
    ;(rows[n + 1] ??= []).push(p)
  }
  return rows
}

describe('足場の生成', () => {
  it('どの足場にも、1つ下の段の足場からジャンプで届く', () => {
    for (const seed of SEEDS) {
      const rows = build(seed)
      for (let i = 1; i < rows.length; i++) {
        for (const p of rows[i]) {
          expect(rows[i - 1].some((q) => canReach(q, p)), `seed ${seed} 段 ${i} ${p.id}`).toBe(true)
        }
      }
    }
  })

  it('足場は壁の内側にあり、同じ段の足場どうしは重ならない', () => {
    for (const seed of SEEDS) {
      for (const row of build(seed)) {
        for (const p of row) {
          expect(p.x).toBeGreaterThanOrEqual(WALL_WIDTH)
          expect(p.x + p.width).toBeLessThanOrEqual(STAGE_WIDTH - WALL_WIDTH)
        }
        for (const a of row) for (const b of row) if (a !== b) expect(a.x + a.width < b.x || b.x + b.width < a.x).toBe(true)
      }
    }
  })

  it('上の段ほど上にあり、topY より上まで作られる', () => {
    const rows = build(1)
    for (let i = 1; i < rows.length; i++) expect(rows[i][0].y).toBeLessThan(rows[i - 1][0].y)
    expect(rows[rows.length - 1][0].y).toBeLessThanOrEqual(TOP)
  })

  it('登るほど足場が少なくなり、段の間が広がる', () => {
    const easy = { count: 0, rise: 0, rows: 0 }
    const hard = { count: 0, rise: 0, rows: 0 }
    for (const seed of SEEDS) {
      const rows = build(seed)
      for (let i = 1; i < rows.length; i++) {
        const climbed = FLOOR_Y - rows[i][0].y
        const bucket = climbed < 800 ? easy : climbed > 5000 ? hard : null
        if (!bucket) continue
        bucket.count += rows[i].length
        bucket.rise += rows[i - 1][0].y - rows[i][0].y
        bucket.rows++
      }
    }
    expect(hard.count / hard.rows).toBeLessThan(easy.count / easy.rows - 1)
    expect(hard.rise / hard.rows).toBeGreaterThan(easy.rise / easy.rows + 15)
  })

  it('左右に偏らない（足場の中心の平均が画面の中央付近）', () => {
    const centers = SEEDS.flatMap((seed) => build(seed).slice(1).flat()).map((p) => p.x + p.width / 2)
    const mean = centers.reduce((a, b) => a + b, 0) / centers.length
    expect(Math.abs(mean - STAGE_WIDTH / 2)).toBeLessThan(40)
    // 左半分・右半分のどちらにも、3割以上ある
    const left = centers.filter((c) => c < STAGE_WIDTH / 2).length / centers.length
    expect(left).toBeGreaterThan(0.3)
    expect(left).toBeLessThan(0.7)
  })

  it('同じ種なら同じステージ、違う種なら違うステージ', () => {
    expect(build(42)).toEqual(build(42))
    expect(build(42)).not.toEqual(build(43))
  })

  it('何回に分けて足しても、1回で足したのと同じ足場になる', () => {
    const { gen } = createStage(5)
    const once = extendStage(gen, -3000).added
    let g = gen
    const parts: Platform[] = []
    for (const top of [200, -500, -1200, -3000]) {
      const r = extendStage(g, top)
      g = r.gen
      parts.push(...r.added)
    }
    expect(parts).toEqual(once)
  })
})

// canReach の約束（高さの差 MAX_RISE、横の隙間 MAX_EDGE_GAP まで届く）が、実際の物理でも守られているか
describe('一番離れた足場にも、ジャンプで届く', () => {
  function tryJump(dir: 1 | -1): boolean {
    const from: Platform = { id: 'from', x: 400, y: 500, width: 80, height: 16 }
    const to: Platform =
      dir > 0
        ? { id: 'to', x: from.x + from.width + MAX_EDGE_GAP, y: from.y - MAX_RISE, width: 70, height: 16 }
        : { id: 'to', x: from.x - MAX_EDGE_GAP - 70, y: from.y - MAX_RISE, width: 70, height: 16 }
    const platforms = [from, to]
    // 足場の端（踏み外さないぎりぎりより少し内側）から、走りながら跳ぶ
    const startX = dir > 0 ? from.x + from.width - PLAYER_SIZE : from.x
    let j: Jumper = { ...createJumper(startX, from.y - PLAYER_SIZE, PLAYER_SIZE), standingOn: 'from', vx: dir * JUMPER.moveSpeed }
    const input = { left: dir < 0, right: dir > 0, jump: true }
    for (let i = 0; i < 120; i++) {
      const moved = moveJumper(j, i < 30 ? input : { ...input, jump: false }, FIXED_DT, JUMPER)
      j = { ...moved, ...updateOnPlatforms(j, moved, platforms, platforms) }
      if (j.standingOn === 'to') return true
    }
    return false
  }

  it('右へ', () => expect(tryJump(1)).toBe(true))
  it('左へ', () => expect(tryJump(-1)).toBe(true))
})
