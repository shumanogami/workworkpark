import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { installAudioUnlock } from './audio/audio'
import PlatformDemoPage from './engine/PlatformDemoPage.tsx'
import ScrollDemoPage from './engine/ScrollDemoPage.tsx'
import SurvivalDemoPage from './engine/SurvivalDemoPage.tsx'
import MiniResultDemoPage from './platform/MiniResultDemoPage.tsx'
import ResultDemoPage from './platform/ResultDemoPage.tsx'
import DevGamePage from './game/DevGamePage.tsx'
import './index.css'
import ControllerDemoPage from './pages/ControllerDemoPage.tsx'
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
        {/* 開発用：横・縦スクロールの動きを確認する（今後のゲームで使う部品） */}
        <Route path="/dev/scroll" element={<ScrollDemoPage />} />
        {/* 開発用：足場（乗れる雲）の動きを確認する（今後のゲームで使う部品） */}
        <Route path="/dev/platforms" element={<PlatformDemoPage />} />
        {/* 開発用：ポイント・脱落・勝敗の部品を、横スクロールと組み合わせて確認する */}
        <Route path="/dev/survival" element={<SurvivalDemoPage />} />
        {/* 開発用：ミニリザルト（ライト）の見た目を確認する */}
        <Route path="/dev/mini-result" element={<MiniResultDemoPage />} />
        {/* 開発用：リザルト（階段）の見た目を確認する */}
        <Route path="/dev/result" element={<ResultDemoPage />} />
        {/* 開発用：スマホのラウンドの合間の表示（勝った・勝てなかった）を確認する */}
        <Route path="/dev/controller" element={<ControllerDemoPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
