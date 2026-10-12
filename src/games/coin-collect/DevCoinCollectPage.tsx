import DevRoundPage from '../../platform/DevRoundPage'
import { coinCollect } from './miniGame'

// 開発用（/dev/coin-collect）：通信・試合の流れなしで、コイン集めの1ラウンドだけをキーボードで遊ぶ
// キーボードで最大4人：1P A/D/W、2P ←/→/↑、3P J/L/I、4P F/H/T。F4 で全画面
export default function DevCoinCollectPage() {
  return <DevRoundPage game={coinCollect} />
}
