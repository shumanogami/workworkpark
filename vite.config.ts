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
})
