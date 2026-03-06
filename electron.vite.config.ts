import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src') //vue文件能被识别@别名
      }
    },
    plugins: [vue()],
    css: {
      preprocessorOptions: {
        scss: {
          // @ts-ignore
          api: 'modern-compiler',
          additionalData: `@use "@/assets/base.scss" as *;`
        }
      }
    }
  }
})
