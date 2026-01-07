//  快捷键配置文件
import { useFlags } from '@/store/flags'

const keydownHandler = (event: KeyboardEvent) => {
  const flags = useFlags()

  // 空格暂停|播放
  switch (event.code) {
    case 'Space':
      event.preventDefault()
      if (window.$audio?.isPlay) {
        window.$audio.pause()
      } else {
        window.$audio?.play()
      }
      break
    case 'ArrowRight':
    case 'ArrowLeft':
      if (window.$audio) {
        event.code === 'ArrowRight'
          ? (window.$audio.el.currentTime += 10)
          : (window.$audio.el.currentTime -= 10)
      }
      break
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      flags.isOpenDetail = event.code === 'ArrowUp'
      break
  }
}
// 按键配置
document.onkeydown = keydownHandler

export {}
