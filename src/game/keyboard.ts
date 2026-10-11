import { useCallback, useEffect, useRef } from 'react'
import type { Inputs } from './types'

// 1人分のキー割り当て（KeyboardEvent.code の値）
export type KeyBinding = {
  playerId: string
  left: string
  right: string
  jump: string
}

// 開発用：スマホの代わりにキーボードで操作する。1台のPCで最大4人まで同時に動かせる
export const DEV_KEY_BINDINGS: KeyBinding[] = [
  { playerId: 'p1', left: 'KeyA', right: 'KeyD', jump: 'KeyW' },
  { playerId: 'p2', left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' },
  { playerId: 'p3', left: 'KeyJ', right: 'KeyL', jump: 'KeyI' },
  { playerId: 'p4', left: 'KeyF', right: 'KeyH', jump: 'KeyT' },
]

// 押されているキーを覚えておき、GameScreen の getInputs に渡せる関数を返す
export function useKeyboardInputs(bindings: KeyBinding[]): () => Inputs {
  const pressed = useRef(new Set<string>())

  useEffect(() => {
    const used = new Set(bindings.flatMap((b) => [b.left, b.right, b.jump]))
    const onKeyDown = (e: KeyboardEvent) => {
      if (!used.has(e.code)) return
      e.preventDefault() // 矢印キーでページがスクロールしないように
      pressed.current.add(e.code)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      pressed.current.delete(e.code)
    }
    // ウィンドウからフォーカスが外れると keyup が届かず押しっぱなしになるため、全部離したことにする
    const onBlur = () => pressed.current.clear()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [bindings])

  return useCallback(() => {
    const keys = pressed.current
    return Object.fromEntries(
      bindings.map((b) => [
        b.playerId,
        {
          playerId: b.playerId,
          left: keys.has(b.left),
          right: keys.has(b.right),
          jump: keys.has(b.jump),
        },
      ]),
    )
  }, [bindings])
}
