import type { Platform } from '../../engine/platforms'
import { FLOOR_Y, HARD_HEIGHT, MAX_EDGE_GAP, MAX_RISE, PLATFORM_HEIGHT, STAGE_HEIGHT, STAGE_WIDTH, WALL_WIDTH } from './constants'

// 足場の自動生成。画面・音には触らない純粋な関数（テストしやすくするため）
// 足場は「段」ごとに下から上へ作る。完全なランダムにはせず、どの足場にも1つ下の段の足場からジャンプで届くようにする
// 登るほど（＝時間が経つほど）、1段の足場の数が減り、段の高さの差と横の隙間が広がる

export type StageGen = {
  seed: number // 乱数の種。同じ種なら同じステージになる（テスト・不具合の再現のため）
  nextY: number // 次に作る段の上面の y
  rows: number // 作った段の数（スタートの岩場は数えない）
  lastRow: Platform[] // 一番上の段（次の段は、ここから届くように置く）
}

const LEFT = WALL_WIDTH
const RIGHT = STAGE_WIDTH - WALL_WIDTH
const EASY_ROWS = 5 // 最初の何段かは足場を多めにして登りやすくする
const MIN_SPACING = 40 // 同じ段の足場どうしの最小の隙間（くっついて1枚に見えないように）

// 乱数（mulberry32）。種を受け取り、0以上1未満の数と次の種を返す
export function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), s | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

// 登った高さから決まる難しさ（0：やさしい 〜 1：一番難しい）
export function difficultyAt(y: number): number {
  return Math.min(Math.max((FLOOR_Y - y) / HARD_HEIGHT, 0), 1)
}

// 足場 from に立っている人が、ジャンプで足場 to に届くか（置き方の約束。物理で届くことはテストで確かめている）
export function canReach(from: Platform, to: Platform): boolean {
  const rise = from.y - to.y
  const edgeGap = Math.max(to.x - (from.x + from.width), from.x - (to.x + to.width), 0)
  return rise <= MAX_RISE && edgeGap <= MAX_EDGE_GAP
}

// スタートの岩場（画面の横いっぱい）
export function createStage(seed: number): { gen: StageGen; platforms: Platform[] } {
  const floor: Platform = { id: 'floor', x: LEFT, y: FLOOR_Y, width: RIGHT - LEFT, height: STAGE_HEIGHT - FLOOR_Y }
  return { gen: { seed, nextY: FLOOR_Y, rows: 0, lastRow: [floor] }, platforms: [floor] }
}

// 一番上の段が topY より上に来るまで段を足す。足した足場だけを返す（今ある足場は消さない）
export function extendStage(gen: StageGen, topY: number): { gen: StageGen; added: Platform[] } {
  const added: Platform[] = []
  let g = gen
  while (g.nextY > topY) {
    const row = makeRow(g)
    added.push(...row.platforms)
    g = row.gen
  }
  return { gen: g, added }
}

function makeRow(gen: StageGen): { gen: StageGen; platforms: Platform[] } {
  let seed = gen.seed
  const rand = () => {
    const [v, s] = nextRandom(seed)
    seed = s
    return v
  }
  const between = (a: number, b: number) => lerp(a, b, rand())

  const easy = gen.rows < EASY_ROWS
  const d = difficultyAt(gen.nextY)
  // 段の高さの差：最初は 60〜85、難しくなると 85〜105
  const rise = Math.min(between(lerp(60, 85, d), lerp(85, MAX_RISE, d)), MAX_RISE)
  const y = Math.round(gen.nextY - rise)
  // 足場の数：最初は多め、だんだん減って最後は1〜2個
  const count = easy ? 4 : d < 0.25 ? 3 : d < 0.6 ? 2 : rand() < 0.5 ? 1 : 2
  const width = () => Math.round(Math.max(between(lerp(115, 70, d), lerp(155, 100, d)), 60))
  const id = (i: number) => `r${gen.rows}-${i}`

  // 1つ目：通り道になる足場。1つ下の段のどれかから、左右どちらかへずらして置く
  // 画面の端に寄っているほど中央へ向かいやすくして、左右に偏らないようにする
  const from = gen.lastRow[Math.floor(rand() * gen.lastRow.length)]
  const w0 = width()
  // 横の隙間：最初は重なるくらい（-40〜0）、難しくなると 30〜90
  const gap = Math.min(between(lerp(-40, 30, d), lerp(0, MAX_EDGE_GAP, d)), MAX_EDGE_GAP)
  const fromCenter = (from.x + from.width / 2 - STAGE_WIDTH / 2) / (STAGE_WIDTH / 2) // -1（左端）〜 1（右端）
  let dir = rand() < 0.5 - fromCenter * 0.35 ? 1 : -1
  const place = (dir: number) => (dir > 0 ? from.x + from.width + gap : from.x - gap - w0)
  let x0 = place(dir)
  if (x0 < LEFT || x0 + w0 > RIGHT) {
    dir = -dir
    x0 = place(dir)
  }
  x0 = Math.round(Math.min(Math.max(x0, LEFT), RIGHT - w0))
  const row: Platform[] = [{ id: id(0), x: x0, y, width: w0, height: PLATFORM_HEIGHT }]

  // 2つ目から：空いている場所にばらまく。1つ下の段から届く場所だけに置く（届かない孤立した足場は作らない）
  for (let i = 1; i < count; i++) {
    const w = width()
    for (let attempt = 0; attempt < 12; attempt++) {
      const p: Platform = { id: id(i), x: Math.round(between(LEFT, RIGHT - w)), y, width: w, height: PLATFORM_HEIGHT }
      const crowded = row.some((q) => p.x < q.x + q.width + MIN_SPACING && q.x < p.x + p.width + MIN_SPACING)
      if (crowded || !gen.lastRow.some((q) => canReach(q, p))) continue
      row.push(p)
      break
    }
  }

  return { gen: { seed, nextY: y, rows: gen.rows + 1, lastRow: row }, platforms: row }
}
