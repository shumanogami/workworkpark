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
// （PCのルームコードは localStorage に移したので、今は以前の版のルームコードを引き継ぐときだけ使う）
function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

// PCのルームコードをどれにするかを決める。保存・読み込みはしない純粋な関数（テストしやすくするため）
// 優先順：① URL で指定したコード（例：/?room=WORK。QRを印刷して貼っておくとき）
//         ② このPCのブラウザに保存してあるコード（タブを閉じても、ブラウザを開き直しても同じQRになる）
//         ③ 以前の版でタブに保存したコード ④ 新しく作る
// 不正な値（4文字の英字でない）は無視する
export function chooseRoomCode(
  candidates: { fromUrl: string | null; saved: string | null; legacy: string | null },
  create: () => string = generateRoomCode,
): string {
  return (
    normalizeRoomCode(candidates.fromUrl) ??
    normalizeRoomCode(candidates.saved) ??
    normalizeRoomCode(candidates.legacy) ??
    create()
  )
}

// PC：ルームコードを決めて、このPCのブラウザに保存する（QRコードを毎回同じにするため）
// 注意：同じブラウザで PC 画面を2つ開くと、2つとも同じルームになる
export function getOrCreateRoomCode(fromUrl: string | null = null): string {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(HOST_ROOM_KEY)
  } catch {
    // 保存できない環境（プライベートブラウズなど）では、その画面の間だけのコードになる
  }
  const code = chooseRoomCode({ fromUrl, saved, legacy: readSession(HOST_ROOM_KEY) })
  try {
    localStorage.setItem(HOST_ROOM_KEY, code)
  } catch {
    // 同上
  }
  return code
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
