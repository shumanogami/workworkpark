import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
// 変数名は ANON_KEY だが、値には sb_publishable_ で始まるキーを入れる（Vercelに登録済みの名前に合わせている）
const publishableKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 環境変数の設定漏れは通信が静かに失敗して原因が分かりにくいため、起動時に明示的に止める
if (!url || !publishableKey) {
  throw new Error(
    'Supabase の環境変数が未設定です。.env.example を .env.local にコピーして値を入れてください（Vercel では環境変数に登録）。',
  )
}

// アプリ全体で共有する Supabase クライアント。Realtime（Broadcast・Presence）のみ使う
export const supabase = createClient(url, publishableKey)
