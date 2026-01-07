// 作用：给音频元素绑定事件，并提供一个简单的事件注册与触发系统
// 事件总线，让你能在不同地方监听和响应音频播放事件。
// 定义了该系统支持的三种自定义事件类型：
// 1. changeSong: 切歌事件（当音频数据加载完毕时触发）
// 2. handleFirstLoad: 首次加载事件（仅在第一次获取到元数据时触发一次，用于初始化）
// 3. cutSong: 手动切歌事件（通常在通过 UI 点击切歌时主动触发）
import { onMounted } from 'vue'

export type ListenerName = 'changeSong' | 'handleFirstLoad' | 'cutSong'

/**
 * useListener Hook
 * @param audio 一个 Vue 的 ref 对象，指向底层的 <audio> DOM 元素
 */
export const useListener = (audio: any) => {
  // 在组件挂载后，开始监听底层的 HTMLAudioElement 原生事件
  onMounted(() => {
    // 监听原生 'loadeddata' 事件
    // 含义：当当前帧的数据已加载，但没有足够的数据播放下一帧时触发 可以认为“切歌成功”了。
    audio.value?.addEventListener('loadeddata', () => {
      console.log('歌曲切换')
      // 触发所有订阅了 'changeSong' 的回调函数
      executeListener('changeSong')
    })
    // 定义一个一次性的初始化函数
    function onFirstLoad() {
      console.log('首次设置src，进行初始化操作...')
      executeListener('handleFirstLoad')
      // 这是一个“单次触发”的设计，防止每次切歌重新加载元数据时都重复执行初始化逻辑。
      audio.value?.removeEventListener('loadedmetadata', onFirstLoad)
    }

    // 监听loadedmetadata事件，实现首加载的初始化操作
    audio.value.addEventListener('loadedmetadata', onFirstLoad)
  })

  const listenerObj: any = {
    changeSong: [], // 歌曲切换 数组中存放一个或者多个回调函数
    handleFirstLoad: [], //  首次设置src，进行初始化操作
    cutSong: []
  }

  /**
   * 注册事件监听
   * @param listener 事件名
   * @param cb 回调函数
   */
  const addListener = (listener: ListenerName, cb: any) => {
    ;(listenerObj[listener] as any[]).push(cb)
  }
  /**
   * 执行事件（发布者）
   * @param listener 要触发的事件名
   */
  const executeListener = (listener: ListenerName) => {
    const len = listenerObj[listener].length
    // 如果没有订阅者，直接返回
    if (len < 1) {
      return
    }
    // 遍历执行所有回调函数
    for (let i = 0; i < len; i++) {
      ;(listenerObj[listener][i] as any)()
    }
  }

  return {
    addListener,
    executeListener
  }
}
