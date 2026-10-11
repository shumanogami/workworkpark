import type { RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef } from 'react'
import { EVENTS, type InputMessage } from '../shared/messages'

export type ButtonName = 'left' | 'right' | 'jump'

// 送り直しの間隔（ミリ秒）。「離した」が届かずキャラが走り続けるのを防ぐ。8人で毎秒16件程度に収まる
const RESEND_INTERVAL_MS = 500

// スマホ側：ボタンの状態をPCへ送る。返り値の setButton をボタンの押した／離したで呼ぶ
// - 状態が変わったときだけ送る（押しっぱなしの間は送らない）
// - ゲーム中（playing）だけ、0.5秒ごとに今の状態を送り直す
export function useInputSender(channel: RealtimeChannel | null, playerId: string, playing: boolean) {
  const buttons = useRef({ left: false, right: false, jump: false })

  const send = useCallback(() => {
    if (!channel) return
    const payload: InputMessage = { playerId, ...buttons.current }
    void channel.send({ type: 'broadcast', event: EVENTS.input, payload })
  }, [channel, playerId])

  const setButton = useCallback(
    (name: ButtonName, pressed: boolean) => {
      if (buttons.current[name] === pressed) return
      buttons.current = { ...buttons.current, [name]: pressed }
      send()
    },
    [send],
  )

  useEffect(() => {
    if (!playing) return
    const id = setInterval(send, RESEND_INTERVAL_MS)
    return () => clearInterval(id)
  }, [playing, send])

  // ラウンドが終わると、スマホはボタンを隠して結果を出す（M9）。押したまま隠れると「離した」が来ないため、
  // 全部離したことにする（そうしないと次のラウンドの始めに、押しっぱなしの状態が送り直されて勝手に動く）
  useEffect(() => {
    if (!playing) buttons.current = { left: false, right: false, jump: false }
  }, [playing])

  // 画面を切り替えた・スリープした瞬間は指を離した通知が来ないことがあるため、全部離したことにして送る
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) return
      buttons.current = { left: false, right: false, jump: false }
      send()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [send])

  return setButton
}
