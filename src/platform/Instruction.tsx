import { useEffect, useState } from 'react'
import { colors, layout } from '../theme'
import { toFurigana } from './furigana'

// ラウンドの始めに、ひと言の指示（「高く跳べ！」など）を出しておく時間。カウントダウン（3・2・1）と同じ長さ（F6 の案）
const INSTRUCTION_MS = 3000

// ラウンドの始めに出す、ひと言の指示（「高く跳べ！」など）。どのミニゲームでも同じ見た目・同じ位置にする（DESIGN.md の「ひと言の指示」）
// - TIME・Round と同じ白い箱（白地に濃紺の枠と文字）に入れる。空・峡谷など背景の色が変わっても同じように読めるように
// - カウントダウンの間、画面の上の中央（TIME の位置）に重ねる。数字（3・2・1）やキャラの名前とは重ならない
// - 漢字にはふりがなを付ける
// ゲーム画面（canvas）の実際の位置と大きさに合わせて置く（全画面やウィンドウの大きさが変わっても、ゲーム画面に対して同じ所に出す）
export default function Instruction({ text }: { text: string }) {
  const [visible, setVisible] = useState(true)
  const [rect, setRect] = useState<StageRect | null>(null)
  useEffect(() => {
    const id = setTimeout(() => setVisible(false), INSTRUCTION_MS)
    return () => clearTimeout(id)
  }, [])
  // 出している間（3秒）は毎コマ canvas の位置を測り直す。全画面への切り替えにもすぐ追いつけるように
  useEffect(() => {
    if (!visible) return
    let rafId = 0
    const measure = () => {
      const canvas = document.querySelector('main canvas')
      const next = canvas ? stageRect(canvas.getBoundingClientRect()) : null
      setRect((prev) => (sameRect(prev, next) ? prev : next))
      rafId = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(rafId)
  }, [visible])
  if (!visible || !rect) return null
  const dot = rect.height / layout.logicalHeight // ゲーム画面の1ドットの大きさ（画面上の px）
  return (
    // z-[60]：全画面のときゲーム画面（canvas）は fixed・z-50 で最前面に出るため、それより手前に出さないと指示が隠れる
    <div
      className="pointer-events-none fixed z-[60] flex justify-center"
      style={{ left: rect.left, width: rect.width, top: rect.top + INSTRUCTION_TOP_DOTS * dot }}
    >
      <p
        className="whitespace-nowrap"
        style={{
          fontSize: INSTRUCTION_FONT_DOTS * dot,
          lineHeight: 1,
          padding: `${4 * dot}px ${12 * dot}px`,
          color: colors.ink.main,
          background: colors.frame.fill,
          border: `${dot}px solid ${colors.frame.border}`,
          borderRadius: 2 * dot,
        }}
      >
        {toFurigana(text).map((s, i) =>
          s.reading ? (
            <ruby key={i}>
              {s.text}
              <rt style={{ fontSize: (INSTRUCTION_FONT_DOTS / 2) * dot, lineHeight: 1 }}>{s.reading}</rt>
            </ruby>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
    </div>
  )
}

// ひと言の箱の位置と文字の大きさ（ゲーム画面 480×270 のドット単位）
// 文字は 32 ドット（DESIGN.md の文字の大きさ）、ふりがなはその半分の 16 ドット。箱は上から 4 ドットの所に置き、TIME の箱を隠す
const INSTRUCTION_TOP_DOTS = 4
const INSTRUCTION_FONT_DOTS = 32

type StageRect = { left: number; top: number; width: number; height: number }

// canvas の要素の中で、16:9 の絵が実際に描かれている範囲（全画面のときは上下か左右に黒い余白ができるため）
function stageRect(r: DOMRect): StageRect {
  const width = Math.min(r.width, (r.height * layout.logicalWidth) / layout.logicalHeight)
  const height = (width * layout.logicalHeight) / layout.logicalWidth
  return { left: r.left + (r.width - width) / 2, top: r.top + (r.height - height) / 2, width, height }
}

function sameRect(a: StageRect | null, b: StageRect | null): boolean {
  if (!a || !b) return a === b
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height
}
