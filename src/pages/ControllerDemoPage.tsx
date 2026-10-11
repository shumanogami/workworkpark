import { controllerView } from '../lib/controllerView'
import type { PhaseMessage } from '../shared/messages'
import { colors, playerColors } from '../theme'
import ControllerPanel from './ControllerPanel'

// 開発用：スマホのラウンドの合間の表示（M9）を、通信なしで場面ごとに並べて確かめるページ（/dev/controller）
// 「たろう」（1P・赤）のスマホとして、勝った・勝てなかった場面を出す。ボタンの見た目は本物のスマホで確かめる

const ME = 'p1'
const players = [
  { playerId: 'p1', number: 1, color: playerColors[0] },
  { playerId: 'p2', number: 2, color: playerColors[1] },
  { playerId: 'p3', number: 3, color: playerColors[2] },
]
const base = { players, gameTitle: 'Jump the highest', instruction: '高く跳べ！' }

const SCENES: [string, PhaseMessage][] = [
  ['ミニリザルト：勝った', { ...base, phase: 'miniResult', winnerIds: ['p1'], wins: { p1: 2, p3: 1 } }],
  ['ミニリザルト：勝てなかった', { ...base, phase: 'miniResult', winnerIds: ['p3'], wins: { p1: 1, p3: 2 } }],
  ['ミニリザルト：3勝した', { ...base, phase: 'miniResult', winnerIds: ['p1'], wins: { p1: 3 } }],
  ['リザルト：1段上がった', { ...base, phase: 'result', winnerIds: ['p1'], steps: { p1: 1 } }],
  ['リザルト：上がれなかった', { ...base, phase: 'result', winnerIds: ['p3'], steps: { p1: 0, p3: 1 } }],
  ['総合優勝：優勝した', { ...base, phase: 'champion', winnerIds: ['p1'] }],
  ['総合優勝：優勝できなかった', { ...base, phase: 'champion', winnerIds: ['p3'] }],
]

export default function ControllerDemoPage() {
  return (
    <div className="h-full overflow-auto p-4">
      <div className="flex flex-wrap gap-6">
        {SCENES.map(([label, msg]) => {
          const view = controllerView(msg, ME)
          return (
            <div key={label}>
              <p className="mb-1 text-sm text-neutral-400">{label}</p>
              {/* 横持ちのスマホ（iPhone の 844×390 を少し縮めた大きさ） */}
              <div className="flex h-[340px] w-[740px] flex-col items-center rounded-3xl border-4 border-neutral-600 p-4">
                <p className="text-5xl" style={{ color: playerColors[0] }}>
                  たろう
                </p>
                {view.kind === 'panel' ? (
                  <ControllerPanel view={view} color={playerColors[0]} />
                ) : (
                  <p style={{ color: colors.ui.start }}>（ボタン）</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
