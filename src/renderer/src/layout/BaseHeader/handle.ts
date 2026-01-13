import { useFlags } from '@/store/flags'

export const handle = () => {
  const flags = useFlags()
  //最大化
  const maximize = () => {
    flags.isMaximize = true
    // 通过 IPC 也就是进程间通信，向 Electron 主进程发送 'maximize' 指令，让主进程去执行真正的窗口最大化操作
    window.electron?.ipcRenderer.send('maximize')
  }
  //取消最大化
  const unmaximize = () => {
    flags.isMaximize = false
    window.electron?.ipcRenderer.send('unmaximize')
  }
  //最小化
  const minimize = () => {
    flags.isMinimize = true
    window.electron?.ipcRenderer.send('minimize')
  }
  //从最小化还原，（通常用于点击任务栏图标时的逻辑）这没用到
  const restore = () => {
    flags.isMinimize = false
    window.electron?.ipcRenderer.send('restore')
  }
  //关闭程序
  const close = () => {
    window.electron?.ipcRenderer.send('close')
  }

  return {
    maximize,
    unmaximize,
    minimize,
    restore,
    close
  }
}
