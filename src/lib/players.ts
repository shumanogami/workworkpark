// 参加者への番号と色の割り当て。PCだけが行う（PCが審判）。通信・画面には触らない純粋な関数
import type { PlayerInfo } from '../shared/messages'
import { playerColors } from '../theme'

export const MAX_PLAYERS = 8

// 番号順の色（1P が赤）。値と選んだ理由は src/theme.ts にある
export const PLAYER_COLORS = playerColors

// スマホにもこの形のまま送るため、通信の型（PlayerInfo）と同じにしている
export type AssignedPlayer = PlayerInfo

// 今つながっている playerId の一覧から、参加者の一覧を作り直す
// - すでに番号を持っている人は、番号と色を変えない（途中で色が変わると混乱するため）
// - いなくなった人は外し、空いた番号は次に来た人に回す（9人目以降が待っている場合も、空いた枠に入れる）
// - 新しく来た人には、空いている一番小さい番号を割り当てる。満員（8人）なら割り当てない
export function assignPlayers(prev: AssignedPlayer[], presentIds: string[]): AssignedPlayer[] {
  const present = new Set(presentIds)
  const kept = prev.filter((p) => present.has(p.playerId))
  const keptIds = new Set(kept.map((p) => p.playerId))
  const usedNumbers = new Set(kept.map((p) => p.number))

  // 同時に来た人の順番は Presence では分からないため、ID順にして結果を毎回同じにする
  const newcomers = presentIds.filter((id) => !keptIds.has(id)).sort()

  const added: AssignedPlayer[] = []
  for (const playerId of newcomers) {
    let number = 1
    while (usedNumbers.has(number)) number++
    if (number > MAX_PLAYERS) break
    usedNumbers.add(number)
    added.push({ playerId, number, color: PLAYER_COLORS[number - 1] })
  }

  return [...kept, ...added].sort((a, b) => a.number - b.number)
}
