import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useRef, useState } from 'react'
import { EVENTS, type PlayerPresence } from '../shared/messages'
import { namesFromPresence } from './playerName'
import { roomTopic } from './room'
import { supabase } from './supabase'

// retrying：接続が切れた・失敗した状態。Supabase が自動で再接続を試みるので、利用者には待ってもらう
// （開発モードでは effect が2回走る影響で、開いた直後に一瞬この状態になることがある）
export type ChannelStatus = 'connecting' | 'connected' | 'retrying'

export type EventName = (typeof EVENTS)[keyof typeof EVENTS]

// ルームのチャンネルに参加し、接続中のスマホ（Presence）の一覧を返す
// - PC：playerId を渡さない。一覧を見るだけで、自分は参加者に数えない
// - スマホ：playerId を渡す。自分を参加者として登録（track）する
// channel は T4 で入力の送受信（Broadcast）に使う
// onBroadcast：Broadcast（EVENTS のいずれか）を受け取ったときに呼ぶ。再描画で関数が変わっても再接続しない
// name：スマホのプレイヤー名。変わったら、つなぎ直さずに Presence の登録内容だけを更新する
// 返り値の names：PC用。playerId → 名前（名前を付けていない人は入らない）
export function useRoomChannel(
  roomCode: string | null,
  playerId?: string,
  onBroadcast?: (event: EventName, payload: unknown) => void,
  name?: string,
) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [status, setStatus] = useState<ChannelStatus>('connecting')
  const [presentIds, setPresentIds] = useState<string[]>([])
  const [names, setNames] = useState<Record<string, string>>({})

  const onBroadcastRef = useRef(onBroadcast)
  useEffect(() => {
    onBroadcastRef.current = onBroadcast
  })

  useEffect(() => {
    if (!roomCode) return
    const topic = roomTopic(roomCode)
    let cancelled = false
    let ch: RealtimeChannel | null = null

    const start = async () => {
      // supabase.channel() は同じ名前のチャンネルが残っていると、それを使い回す。
      // 開発モードでは effect が「実行→片付け→実行」と2回走り、片付け（切断）が終わる前に2回目が来るため、
      // 古いチャンネルの切断を待ってから作り直す
      const stale = supabase.getChannels().find((c) => c.topic === `realtime:${topic}`)
      if (stale) await supabase.removeChannel(stale)
      if (cancelled) return

      const created = supabase.channel(topic, {
        // key を playerId にすると、同じスマホが再読み込みしても1人として数えられる
        config: { presence: { key: playerId ?? '', enabled: true } },
      })
      ch = created
      // 受信の登録は subscribe の前に済ませる（片付けはチャンネルごと捨てることで行う）
      for (const event of Object.values(EVENTS)) {
        created.on('broadcast', { event }, ({ payload }) => {
          if (!cancelled) onBroadcastRef.current?.(event, payload)
        })
      }
      created
        .on('presence', { event: 'sync' }, () => {
          if (cancelled) return
          const state = created.presenceState()
          setPresentIds(Object.keys(state))
          setNames(namesFromPresence(state))
        })
        .subscribe((s) => {
          if (cancelled) return
          if (s === 'SUBSCRIBED') {
            setStatus('connected')
            setChannel(created)
          } else if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') {
            setStatus('retrying')
          }
        })
    }
    void start()

    return () => {
      cancelled = true
      setChannel(null)
      setStatus('connecting')
      setPresentIds([])
      setNames({})
      if (ch) void supabase.removeChannel(ch)
    }
  }, [roomCode, playerId])

  // スマホ：つながったとき、名前を変えたときに、自分の情報を Presence に登録する（同じ key なら上書きされる）
  useEffect(() => {
    if (!channel || !playerId) return
    const presence: PlayerPresence = { playerId, ...(name ? { name } : {}) }
    void channel.track(presence)
  }, [channel, playerId, name])

  return { channel, status, presentIds, names }
}
