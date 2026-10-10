/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // 同じWi-Fiのスマホから http://<PCのIP>:5173/controller で開けるようにする
    host: true,
  },
  test: {
    // 自動テストの対象は物理処理と勝敗判定（純粋な関数）のみ。画面・通信は実機で確認する
    include: ['src/**/*.test.ts'],
  },
})
