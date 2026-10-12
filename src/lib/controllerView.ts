import { STEPS_TO_WIN, WINS_TO_CLEAR } from '../platform/match'
import type { PhaseMessage } from '../shared/messages'

// スマホに何を出すかを、PCから届いた画面の状態（PhaseMessage）と自分の playerId から決める（タスク M9）
// 画面には触らない純粋な関数（テストしやすくするため）。見た目は ControllerPage.tsx
//
// ホーム・ラウンド中：ボタンだけを出す（コントローラーは全ゲーム共通。「生き残れ！」などのひと言はPCの画面だけに出す）
// ラウンドの合間（ミニリザルト・リザルト・総合優勝）：ボタンは効かないので隠し、結果を大きく出す

export type ControllerView =
  | { kind: 'buttons' }
  | {
      kind: 'panel'
      sub: string // 名前の下の小さい文字（ゲームの名前など）
      headline: string // 大きい文字（「勝った！」など）
      highlight: boolean // 自分が勝ったか（大きい文字を目立つ色にする）
      stairs?: { levels: number; current: number } // 小さな階段。levels 段のうち、自分が今いる段（0＝地面）
      note: string // 階段の下の文字（「あと1勝でこのゲームの勝者」など）
    }

// 勝った人を「2P」「1P・3P」のように番号で書く。スマホには参加者の名前が届かないため番号にする
function winnerLabels(msg: PhaseMessage): string {
  const ids = msg.winnerIds ?? []
  return (msg.players ?? [])
    .filter((p) => ids.includes(p.playerId))
    .map((p) => `${p.number}P`)
    .join('・')
}

export function controllerView(msg: PhaseMessage, playerId: string): ControllerView {
  const won = (msg.winnerIds ?? []).includes(playerId)
  const title = msg.gameTitle ?? ''

  switch (msg.phase) {
    case 'lobby':
      return { kind: 'buttons' }
    case 'playing':
      return { kind: 'buttons' }
    case 'miniResult': {
      // ラウンドに勝つたびに1段上がり、WINS_TO_CLEAR 段目に着いたらそのミニゲームの勝者
      const wins = Math.min(WINS_TO_CLEAR, msg.wins?.[playerId] ?? 0)
      return {
        kind: 'panel',
        sub: title,
        headline: won ? '勝った！' : '次のラウンドへ',
        highlight: won,
        stairs: { levels: WINS_TO_CLEAR, current: wins },
        note: wins >= WINS_TO_CLEAR ? 'このゲームの勝者！' : `あと${WINS_TO_CLEAR - wins}勝でこのゲームの勝者`,
      }
    }
    case 'result': {
      const steps = Math.min(STEPS_TO_WIN, msg.steps?.[playerId] ?? 0)
      const winners = winnerLabels(msg)
      return {
        kind: 'panel',
        sub: won || !winners ? `${title} の勝者` : `${title} の勝者は ${winners}`,
        headline: won ? '1段上がった！' : '次のゲームへ',
        highlight: won,
        stairs: { levels: STEPS_TO_WIN, current: steps },
        note: steps >= STEPS_TO_WIN ? '一番上に着いた！' : `あと${STEPS_TO_WIN - steps}段で優勝`,
      }
    }
    case 'champion':
      return won
        ? { kind: 'panel', sub: '', headline: '優勝！', highlight: true, note: 'おめでとう！' }
        : {
            kind: 'panel',
            sub: '',
            headline: '試合終了',
            highlight: false,
            note: `優勝は ${winnerLabels(msg)}。PCの画面を見てね`,
          }
  }
}
