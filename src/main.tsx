import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { installAudioUnlock } from './audio/audio'
import DevGamePage from './game/DevGamePage.tsx'
import './index.css'
import ControllerPage from './pages/ControllerPage.tsx'
import HostPage from './pages/HostPage.tsx'

// ブラウザは利用者が操作するまで音を鳴らせないため、最初のクリック・タップ・キー入力で音を有効にする
installAudioUnlock()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        {/* PC：ゲーム画面（ホーム・ゲーム・リザルト） */}
        <Route path="/" element={<HostPage />} />
        {/* スマホ：コントローラー（QRコードから ?room=ABCD 付きで開く） */}
        <Route path="/controller" element={<ControllerPage />} />
        {/* 開発用：通信なしでゲーム画面だけを確認する */}
        <Route path="/dev/game" element={<DevGamePage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
