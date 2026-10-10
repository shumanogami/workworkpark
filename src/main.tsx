import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import './index.css'
import ControllerPage from './pages/ControllerPage.tsx'
import HostPage from './pages/HostPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* PC：ゲーム画面（ホーム・ゲーム・リザルト） */}
        <Route path="/" element={<HostPage />} />
        {/* スマホ：コントローラー（QRコードから ?room=ABCD 付きで開く） */}
        <Route path="/controller" element={<ControllerPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
