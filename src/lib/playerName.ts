// プレイヤー名の扱い。画面・通信には触らない純粋な関数と、名前の保存

// 名前の最大文字数
export const MAX_NAME_LENGTH = 8

const NAME_KEY = 'workworkpark:playerName'

// 文字数を数える単位。絵文字など2つ分の符号で表される文字も1文字として数える
function chars(text: string): string[] {
  return Array.from(text)
}

// 入力中の文字を最大文字数で切る（9文字目以降は入らない）
export function limitName(text: string): string {
  return chars(text).slice(0, MAX_NAME_LENGTH).join('')
}

// 確定するときの名前。前後の空白を取り、最大文字数で切る。空なら ''（＝初期値の「{番号}P」を使う）
export function normalizeName(text: string): string {
  return limitName(text.trim())
}

// 画面に表示する名前。名前がなければ「{番号}P」
export function displayName(name: string | undefined, number: number): string {
  return name ? name : `${number}P`
}

// Presence の状態（playerId → 登録した内容の配列）から、playerId → 名前 を取り出す
// スマホから届く値なので、文字列でないものや長すぎるものはここで整える
export function namesFromPresence(state: Record<string, unknown[]>): Record<string, string> {
  const names: Record<string, string> = {}
  for (const [playerId, metas] of Object.entries(state)) {
    // 同じ playerId で複数回登録されていたら、最後に登録したものを使う
    const last = metas[metas.length - 1] as { name?: unknown } | undefined
    const name = typeof last?.name === 'string' ? normalizeName(last.name) : ''
    if (name) names[playerId] = name
  }
  return names
}

// スマホから Broadcast で届いた名前の通知か（形の確認）
export function isNameMessage(payload: unknown): payload is { playerId: string; name: string } {
  const p = payload as { playerId?: unknown; name?: unknown } | null
  return typeof p?.playerId === 'string' && typeof p?.name === 'string'
}

// 表示に使う名前を決める
// - presence：Presence から読んだ名前（正しい名前の置き場所だが、PCに届くまで約3秒遅れる）
// - pending：Broadcast ですぐに届いた名前（playerId → 名前。'' は初期値に戻した）
// Broadcast の名前は、Presence が同じ名前に追いつくまで優先する（遅れて届いた古い名前に戻らないように）
// 返り値の pending は、追いついた分を取り除いたもの
export function resolveNames(
  presence: Record<string, string>,
  pending: Record<string, string>,
): { names: Record<string, string>; pending: Record<string, string> } {
  const names = { ...presence }
  const stillPending: Record<string, string> = {}
  for (const [playerId, name] of Object.entries(pending)) {
    if ((presence[playerId] ?? '') === name) continue // Presence が追いついた
    stillPending[playerId] = name
    if (name) names[playerId] = name
    else delete names[playerId]
  }
  return { names, pending: stillPending }
}

// PC：試合の途中でスマホが切れても、その人の名前を「{番号}P」に戻さないよう、最後に分かっていた名前を覚えておく（方針.md の Q4）
// つながっている人は今の名前（名前を消した人は消す）、つながっていない人は覚えていた名前のまま
// 変わりがなければ prev をそのまま返す（React の state に入れて、変わったときだけ描画し直すため）
export function rememberNames(
  prev: Record<string, string>,
  names: Record<string, string>,
  presentIds: readonly string[],
): Record<string, string> {
  const next = { ...prev }
  for (const id of presentIds) {
    if (names[id]) next[id] = names[id]
    else delete next[id]
  }
  const keys = Object.keys(next)
  const same = keys.length === Object.keys(prev).length && keys.every((k) => prev[k] === next[k])
  return same ? prev : next
}

// 名前はブラウザに保存し、再接続・再読み込みの後も同じ名前を使う
// （プライベートブラウズなどで保存できないときは、その画面の間だけ使う）
export function loadName(): string {
  try {
    return normalizeName(localStorage.getItem(NAME_KEY) ?? '')
  } catch {
    return ''
  }
}

export function saveName(name: string) {
  try {
    if (name) localStorage.setItem(NAME_KEY, name)
    else localStorage.removeItem(NAME_KEY)
  } catch {
    // 保存できなくても、この画面の間は名前が使える
  }
}
