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
