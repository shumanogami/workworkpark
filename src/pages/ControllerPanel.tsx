import CharacterIcon from '../game/CharacterIcon'
import type { ControllerView } from '../lib/controllerView'
import { colors } from '../theme'

type Props = {
  view: Extract<ControllerView, { kind: 'panel' }>
  color: string // 自分の色（階段の上のキャラ）
}

// スマホ：ラウンドの合間（ミニリザルト・リザルト・総合優勝）に、ボタンの代わりに出す結果（タスク M9）
// 大きい文字、小さな階段（自分が今いる段）、その下に「あと○○」。PCのリザルト（階段）と同じ草と土のブロック
export default function ControllerPanel({ view, color }: Props) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
      {view.sub && <p className="text-sm text-neutral-400">{view.sub}</p>}
      {/* 勝ったときは START! と同じ山吹色で目立たせる */}
      <p className="text-5xl leading-tight" style={{ color: view.highlight ? colors.ui.start : colors.ui.text }}>
        {view.headline}
      </p>
      {view.stairs && <MiniStairs levels={view.stairs.levels} current={view.stairs.current} color={color} />}
      <p className="text-base text-neutral-400">{view.note}</p>
    </div>
  )
}

// 1段の幅・高さ・キャラの大きさ（px）。スマホの横持ちの低い画面にも収まる大きさ
const STEP_WIDTH = 44
const STEP_HEIGHT = 18
const CHARACTER_SIZE = 28

// 小さな階段：左から 地面（0段）→ 1段目 → … → levels 段目。自分のキャラを current 段目に乗せる
function MiniStairs({ levels, current, color }: { levels: number; current: number; color: string }) {
  return (
    <div className="flex items-end" aria-label={`${levels}段のうち${current}段目`}>
      {Array.from({ length: levels + 1 }, (_, step) => (
        <div
          key={step}
          className="relative"
          style={{
            width: STEP_WIDTH,
            height: 8 + STEP_HEIGHT * step,
            backgroundColor: colors.dirt.main,
            borderTop: `4px solid ${colors.grass.main}`,
          }}
        >
          {step === current && (
            <div className="absolute bottom-full left-1/2 flex -translate-x-1/2">
              <CharacterIcon color={color} size={CHARACTER_SIZE} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
