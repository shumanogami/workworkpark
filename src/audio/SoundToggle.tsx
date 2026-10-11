import { useEffect, useState } from 'react'
import { isMuted, onMutedChange, setMuted } from './audio'

// 音のオン・オフを切り替えるボタン。PC では M キーでも切り替えられる
export default function SoundToggle() {
  const [muted, setMutedView] = useState(isMuted)
  useEffect(() => onMutedChange(setMutedView), [])

  return (
    <button
      className="border-2 border-white px-3 py-1"
      onClick={(e) => {
        e.currentTarget.blur() // フォーカスが残るとキー操作で誤って押されるため外す
        setMuted(!muted)
      }}
    >
      {muted ? '音：オフ' : '音：オン'}
    </button>
  )
}
