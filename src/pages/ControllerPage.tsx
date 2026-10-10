import { useSearchParams } from 'react-router'

// スマホ側のコントローラー画面（仮）。横持ち・ボタン3つの画面を作る予定。
export default function ControllerPage() {
  const [searchParams] = useSearchParams()
  const room = searchParams.get('room')

  return (
    <main className="flex h-full flex-col items-center justify-center gap-4">
      <h1 className="text-3xl">コントローラー（仮）</h1>
      <p className="text-neutral-400">ルーム：{room ?? '未指定'}</p>
    </main>
  )
}
