import type { Platform } from '../../engine/platforms'
import { OBJECT_SIZE, hitRect } from '../../engine/objects'
import type { Item } from '../../engine/score'
import { BLOCK_WIDTH, COIN_POINTS, FIRST_BLOCK_X, GAP_MAX, GROUND_Y, HIGH_Y, MID_Y, PLATFORM_HEIGHT } from './constants'

// コインと足場の並べ方。画面・音には触らない純粋な関数（テストしやすくするため）
// 横幅 BLOCK_WIDTH の「ブロック」を5種類用意し、乱数で並べて道を作る。同じ種類は続けない。左右を反転することもある
// 地面は途切れない（穴はない）。上手な人ほど多く取れるよう、高い所ほどコインが多い

export type BlockKind = 'ground' | 'arch' | 'midPlat' | 'treasure' | 'stairs'
export const BLOCK_KINDS: readonly BlockKind[] = ['ground', 'arch', 'midPlat', 'treasure', 'stairs']

const COIN = OBJECT_SIZE.coin.width // コインの見た目の大きさ（24px）
const LOW = GROUND_Y - COIN - 6 // 地面を歩いて取れるコインの y（コインの見た目の上端）
const onTop = (platformY: number) => platformY - COIN - 6 // 足場に乗って取れるコインの y

type Spec = {
  platforms: { x: number; y: number; width: number }[] // x はブロックの左端から
  coins: { x: number; y: number }[] // コインの見た目の左上。x はブロックの左端から
}

const row = (n: number, x: number, step: number, y: number) => Array.from({ length: n }, (_, i) => ({ x: x + i * step, y }))

// 各ブロックの中身（反転する前）。どのブロックも「地面・中段・高段」の2〜3段にコインを置く
// 1段だけだと、一番右の人が総取りして他の人が取れないため。人が散らばって、取り合いと別行動の両方が起きるようにする
const SPECS: Record<BlockKind, Spec> = {
  // 地面の列 + 中段の小さな足場
  ground: {
    platforms: [{ x: 300, y: MID_Y, width: 140 }],
    coins: [...row(5, 30, 55, LOW), ...row(3, 330, 40, onTop(MID_Y))],
  },
  // ジャンプのアーチ（山なりの5枚は跳ばないと取れない）+ 奥に中段の足場
  arch: {
    platforms: [{ x: 340, y: MID_Y, width: 130 }],
    coins: [
      ...row(2, 20, 50, LOW),
      { x: 130, y: LOW - 40 },
      { x: 170, y: LOW - 90 },
      { x: 210, y: LOW - 110 },
      { x: 250, y: LOW - 90 },
      { x: 290, y: LOW - 40 },
      ...row(3, 365, 35, onTop(MID_Y)),
    ],
  },
  // 中段の長い足場 + その上の高段の足場
  midPlat: {
    platforms: [
      { x: 100, y: MID_Y, width: 280 },
      { x: 170, y: HIGH_Y, width: 140 },
    ],
    coins: [...row(2, 30, 50, LOW), ...row(4, 130, 40, onTop(MID_Y)), ...row(3, 195, 35, onTop(HIGH_Y)), ...row(2, 400, 45, LOW)],
  },
  // 高段の宝：中段から高段へ登った先に8枚が並ぶ（腕前が要る）
  treasure: {
    platforms: [
      { x: 20, y: MID_Y, width: 140 },
      { x: 190, y: HIGH_Y, width: 250 },
    ],
    coins: [...row(2, 60, 50, onTop(MID_Y)), ...row(8, 200, 30, onTop(HIGH_Y)), ...row(2, 300, 60, LOW)],
  },
  // 階段：60pxずつ上がる3段。各段に2枚 + 地面
  stairs: {
    platforms: [
      { x: 20, y: GROUND_Y - 60, width: 110 },
      { x: 160, y: GROUND_Y - 120, width: 110 },
      { x: 300, y: GROUND_Y - 180, width: 110 },
    ],
    coins: [
      ...row(2, 45, 35, onTop(GROUND_Y - 60)),
      ...row(2, 185, 35, onTop(GROUND_Y - 120)),
      ...row(2, 325, 35, onTop(GROUND_Y - 180)),
      ...row(2, 150, 150, LOW),
      { x: 440, y: LOW },
    ],
  },
}

export type StageGen = {
  seed: number // 乱数の種。同じ種なら同じ道になる（テスト・不具合の再現のため）
  nextX: number // 次のブロックを置く左端
  count: number // 作ったブロックの数
  last: BlockKind | null
}

// 乱数（mulberry32）。種を受け取り、0以上1未満の数と次の種を返す
export function nextRandom(seed: number): [number, number] {
  const s = (seed + 0x6d2b79f5) | 0
  let t = Math.imul(s ^ (s >>> 15), s | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, s]
}

export const GROUND_PLATFORM: Platform = { id: 'ground', x: -1000, y: GROUND_Y, width: 1e6, height: 540 - GROUND_Y }

export function coinItem(id: string, x: number, y: number): Item {
  return { id, ...hitRect('coin', x, y), points: COIN_POINTS, kind: 'coin' }
}

export function createStage(seed: number): StageGen {
  return { seed, nextX: FIRST_BLOCK_X, count: 0, last: null }
}

// 画面の右端 untilX より先まで、ブロックを足す。足したものだけを返す（今あるものは消さない）
export function extendStage(gen: StageGen, untilX: number): { gen: StageGen; platforms: Platform[]; coins: Item[] } {
  const platforms: Platform[] = []
  const coins: Item[] = []
  let g = gen
  while (g.nextX < untilX) {
    let seed = g.seed
    const rand = () => {
      const [v, s] = nextRandom(seed)
      seed = s
      return v
    }
    // 最初は歩くだけで取れる地面の列。それ以降は、前と同じ種類以外から選ぶ
    const choices = g.last === null ? (['ground'] as BlockKind[]) : BLOCK_KINDS.filter((k) => k !== g.last)
    const kind = choices[Math.floor(rand() * choices.length)]
    const flip = rand() < 0.5
    const gap = Math.round(rand() * GAP_MAX)
    const spec = SPECS[kind]
    const x0 = g.nextX
    spec.platforms.forEach((p, i) => {
      const x = flip ? BLOCK_WIDTH - p.x - p.width : p.x
      platforms.push({ id: `b${g.count}-p${i}`, x: x0 + x, y: p.y, width: p.width, height: PLATFORM_HEIGHT })
    })
    spec.coins.forEach((c, i) => {
      const x = flip ? BLOCK_WIDTH - c.x - COIN : c.x
      coins.push(coinItem(`b${g.count}-c${i}`, x0 + x, c.y))
    })
    g = { seed, nextX: x0 + BLOCK_WIDTH + gap, count: g.count + 1, last: kind }
  }
  return { gen: g, platforms, coins }
}
