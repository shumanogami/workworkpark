import { STEPS_TO_WIN } from './match'

// リザルト（階段）の並べ方。画面には触らない純粋な関数（テストしやすくするため）
// 階段は左から 地面（0段）→ 1段目 → … → 一番上（STEPS_TO_WIN 段）。同じ段の人は横に並ぶ
// 位置はすべて画面（16:9）の幅・高さに対する %。画面の大きさが変わっても形が崩れないようにするため

export const STAIRS = {
  left: 5, // 地面の左端（幅の %）
  columnWidth: 30, // 1段分の幅（幅の %）
  baseHeight: 12, // 地面の高さ（高さの %）
  stepHeight: 17, // 1段の高さ（高さの %）
  characterSize: 3.5, // キャラの大きさ（幅の %）。8人が同じ段に並んでも、1段の幅に収まる大きさ
  gap: 0.2, // 隣のキャラとのすき間（幅の %）。8人×3.5＋7×0.2＝29.4 で 1段の幅（30）に収まる
} as const

// 勝者が上がる前の段数。リザルトでは「上がる前」から「上がった後」へ動かす
export function stepsBefore(steps: Record<string, number>, gameWinners: readonly string[]): Record<string, number> {
  const before = { ...steps }
  for (const id of gameWinners) before[id] = Math.max(0, (before[id] ?? 0) - 1)
  return before
}

export type Spot = {
  left: number // キャラの左端（幅の %）
  bottom: number // キャラの足もと（高さの %）
  nameRaised: boolean // 名前を1段上に出すか。同じ段に5人以上いると隣の名前と重なるため、1人おきに上下へずらす
}

// 同じ段にこの人数より多くいたら、名前を1人おきに上下へずらす
export const MAX_NAMES_IN_ROW = 4

// 参加者（番号順）と段数から、1人ずつの立つ位置を返す。同じ段の人は番号順に左から並べ、段の真ん中にそろえる
export function standingSpots(playerIds: readonly string[], steps: Record<string, number>): Record<string, Spot> {
  const stepOf = (id: string) => Math.min(STEPS_TO_WIN, steps[id] ?? 0)
  const spots: Record<string, Spot> = {}
  for (let step = 0; step <= STEPS_TO_WIN; step++) {
    const group = playerIds.filter((id) => stepOf(id) === step)
    const pitch = STAIRS.characterSize + STAIRS.gap
    const center = STAIRS.left + STAIRS.columnWidth * step + STAIRS.columnWidth / 2
    group.forEach((id, i) => {
      spots[id] = {
        left: center + (i - (group.length - 1) / 2) * pitch - STAIRS.characterSize / 2,
        bottom: STAIRS.baseHeight + STAIRS.stepHeight * step,
        nameRaised: group.length > MAX_NAMES_IN_ROW && i % 2 === 1,
      }
    })
  }
  return spots
}
