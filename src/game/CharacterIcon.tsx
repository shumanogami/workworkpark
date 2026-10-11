import { useEffect, useRef } from 'react'
import { drawCharacter, SPRITE_SIZE } from './sprite'

type Props = {
  color: string
  size: number // 表示する大きさ（px）
}

// ゲーム外（リザルト画面など）でキャラクターを1体表示する。ゲーム画面と同じドット絵を使う
export default function CharacterIcon({ color, size }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, SPRITE_SIZE, SPRITE_SIZE)
    drawCharacter(ctx, 0, 0, SPRITE_SIZE, color)
  }, [color])

  // 20×20 で描いて CSS で拡大する。pixelated でドットがぼやけないようにする
  return (
    <canvas
      ref={ref}
      width={SPRITE_SIZE}
      height={SPRITE_SIZE}
      style={{ width: size, height: size }}
      className="[image-rendering:pixelated]"
    />
  )
}
