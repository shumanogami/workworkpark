import type { RealtimeChannel } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import type { PlayerPresence } from '../shared/messages'
import { roomTopic } from './room'
import { supabase } from './supabase'

// retrying：接続が切れた・失敗した状態。Supabase が自動で再接続を試みるので、利用者には待ってもらう
// （開発モードでは effect が2回走る影響で、開いた直後に一瞬この状態になることがある）
export type ChannelStatus = 'connecting' | 'connected' | 'retrying'

// ルームのチャンネルに参加し、接続中のスマホ（Presence）の一覧を返す
// - PC：playerId を渡さない。一覧を見るだけで、自分は参加者に数えない
// - スマホ：playerId を渡す。自分を参加者として登録（track）する
// channel は T4 で入力の送受信（Broadcast）に使う
export function useRoomChannel(roomCode: string | null, playerId?: string) {
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)
  const [status, setStatus] = useState<ChannelStatus>('connecting')
  const [presentIds, setPresentIds] = useState<string[]>([])

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
      created
        .on('presence', { event: 'sync' }, () => {
          if (cancelled) return
          setPresentIds(Object.keys(created.presenceState()))
        })
        .subscribe(async (s) => {
          if (cancelled) return
          if (s === 'SUBSCRIBED') {
            setStatus('connected')
            setChannel(created)
            if (playerId) {
              const presence: PlayerPresence = { playerId }
              await created.track(presence)
            }
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
      if (ch) void supabase.removeChannel(ch)
    }
  }, [roomCode, playerId])

  return { channel, status, presentIds }
}
