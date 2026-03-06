//  快捷键配置文件
import { useFlags } from '@/store/flags'

// 定义核心的键盘事件处理函数
const keydownHandler = (event: KeyboardEvent) => {
  const flags = useFlags()
  // 输入防冲突：如果是输入框，则不响应全局快捷键 原来在输入框按空格也能暂停/播放音乐
  const target = event.target as HTMLElement
  if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) {
    return
  }

  /// 根据按键码 (event.code) 执行对应逻辑
  switch (event.code) {
    // 空格暂停|播放
    case 'Space':
      event.preventDefault() //阻止默认行为，防止页面滚动
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
          ? (window.$audio.el.currentTime += 10) //加10秒
          : (window.$audio.el.currentTime -= 10)
      }
      break
    case 'ArrowUp':
    case 'ArrowDown':
      event.preventDefault()
      flags.isOpenDetail = event.code === 'ArrowUp' //上下方向键控制详情页展开
      break
  }
}

// 显式初始化函数
export function initGlobalShortcut() {
  document.addEventListener('keydown', keydownHandler)
}

// 可选：移除监听函数
export function removeGlobalShortcut() {
  document.removeEventListener('keydown', keydownHandler)
}
