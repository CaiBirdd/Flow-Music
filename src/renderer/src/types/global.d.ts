import { MusicPlayerInstanceType } from '@/components/MusicPlayer/index.vue'
import { ElectronAPI } from '@electron-toolkit/preload'

type Channel = 'maximize' | 'unmaximize' | 'minimize' | 'restore' | 'close'

// 为浏览器环境添加 NodeJS 类型兼容
declare namespace NodeJS {
  type Timer = number
  type Timeout = number
}

declare global {
  interface Window {
    $audio: MusicPlayerInstanceType //$是提醒全局变量 别撞了名字
    $login: any
    electron: ElectronAPI
    electronAPI?: ElectronAPI
  }

  interface ImportMetaEnv {
    VITE_URL: string
  }

  // 全局 $audio 变量（用于某些文件中直接使用 $audio 而不是 window.$audio）
  var $audio: MusicPlayerInstanceType
}

declare module '@electron-toolkit/preload' {
  interface IpcRenderer {
    send(channel: Channel, ...args: any[]): void
  }
}
// 给项目里用到的全局变量和环境对象提供 TypeScript 类型，避免类型报错并让 IDE 有提示。
