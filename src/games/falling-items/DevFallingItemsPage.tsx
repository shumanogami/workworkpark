import DevRoundPage from '../../platform/DevRoundPage'
import { fallingItems } from './miniGame'

// 開発用（/dev/falling-items）：通信・試合の流れなしで、落下物避けの1ラウンドだけをキーボードで遊ぶ
// キーボードで最大4人：1P A/D/W、2P ←/→/↑、3P J/L/I、4P F/H/T。F4 で全画面
export default function DevFallingItemsPage() {
  return <DevRoundPage game={fallingItems} />
}
