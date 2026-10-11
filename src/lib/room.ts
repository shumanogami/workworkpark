// ルームコードと playerId の生成・保存。通信そのものは useRoomChannel.ts で行う

// 読み間違えやすい文字（I と 1、O と 0）は入れない。QRが読めず手で打つときに迷わないように
const ROOM_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const ROOM_CODE_LENGTH = 4

const HOST_ROOM_KEY = 'workworkpark:roomCode'
const PLAYER_ID_KEY = 'workworkpark:playerId'

export function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

// URLのルームコードを大文字にそろえる。不正な値なら null
export function normalizeRoomCode(raw: string | null): string | null {
  const code = raw?.trim().toUpperCase() ?? ''
  return /^[A-Z]{4}$/.test(code) ? code : null
}

// Supabase Realtime のチャンネル名
export function roomTopic(roomCode: string): string {
  return `room:${roomCode}`
}

// sessionStorage は、プライベートブラウズ等で使えないと例外を投げることがあるため、失敗しても動くようにする
function loadOrCreate(key: string, create: () => string): string {
  try {
    const saved = sessionStorage.getItem(key)
    if (saved) return saved
    const value = create()
    sessionStorage.setItem(key, value)
    return value
  } catch {
    return create()
  }
}

// PC：再読み込みしても同じルームのままにする（つないだスマホが置いていかれないように）
export function getOrCreateRoomCode(): string {
  return loadOrCreate(HOST_ROOM_KEY, generateRoomCode)
}

// スマホ：同じスマホなら、再読み込み・タブを閉じた後・QRを読み直した後も同じ playerId で復帰させる（方針.md の Q4）
// タブを閉じても残るよう localStorage に置く（sessionStorage だと、タブを閉じる・iPhone がタブを破棄すると別人になる）
// 以前の版で sessionStorage に保存した playerId があれば、それを引き継ぐ
// crypto.randomUUID() は https 以外（http://192.168... での開発時）のスマホで使えないため、Math.random で作る
// 注意：同じブラウザの別タブは同じ playerId になる。1台のPCで複数人を試すときは、別のブラウザかシークレットウィンドウを使う
export function getOrCreatePlayerId(): string {
  try {
    const saved = localStorage.getItem(PLAYER_ID_KEY) ?? sessionStorage.getItem(PLAYER_ID_KEY)
    const playerId = saved || newPlayerId()
    localStorage.setItem(PLAYER_ID_KEY, playerId)
    return playerId
  } catch {
    return newPlayerId()
  }
}

function newPlayerId(): string {
  return Math.random().toString(36).slice(2, 10)
}
