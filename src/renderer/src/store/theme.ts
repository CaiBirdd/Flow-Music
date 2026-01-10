import { defineStore } from 'pinia'
import ColorThief from 'colorthief'
import { toggleImg } from '@/utils'

// 定义 store，主要用于管理全局背景色的动态切换
export const useTheme = defineStore('themeId', {
  state() {
    return {
      bgColor: '' as string | number[], //存储计算出来的背景色
      activeLayerIndex: 1 //切换背景的指针
    }
  },
  actions: {
    change(src?: string) {
      const opacityBg0 = document.querySelector('#opacity-bg0') as HTMLDivElement
      const opacityBg1 = document.querySelector('#opacity-bg1') as HTMLDivElement
      if (src) {
        toggleImg(src).then((img) => {
          const colorThief = new ColorThief()
          let rgb = colorThief.getColor(img) //取主色调
          rgb = [rgb[0] / 2, rgb[1] * 0.6, rgb[2] * 0.7] //颜色微调，压暗一些
          //防抖检测：如果新算出来的颜色跟当前颜色一模一样，就直接退出，啥也不干，省得浪费性能重绘。
          //例如 rgb = [255, 0, 0] this.bgColor = [255, 0, 0]
          const isRepeat = rgb.every((item, index) => {
            return item === this.bgColor[index]
          })
          if (isRepeat) {
            return
          }
          // 更新 State：记录新的颜色
          this.bgColor = rgb
          // 缓冲切换逻辑
          if (this.activeLayerIndex === 0) {
            opacityBg0.style.backgroundImage = `linear-gradient(rgb(${rgb}) , rgb(19, 19, 26) 60%)`
            opacityBg0.style.opacity = '1'
            opacityBg1.style.opacity = '0'
            this.activeLayerIndex = 1
          } else {
            opacityBg1.style.backgroundImage = `linear-gradient(rgb(${rgb}) , rgb(19, 19, 26) 60%)`
            opacityBg1.style.opacity = '1'
            opacityBg0.style.opacity = '0'
            this.activeLayerIndex = 0
          }
        })
      } else {
        // 如果没传 src (比如只有纯色模式，或者列表清空了)，就重置背景
        this.bgColor = ''
        // 同样的双缓冲切换逻辑，只是这次不是画渐变色，而是清空背景。
        if (this.activeLayerIndex === 0) {
          opacityBg0.style.backgroundImage = ``
          opacityBg0.style.opacity = '1'
          opacityBg1.style.opacity = '0'
          this.activeLayerIndex = 1
        } else {
          opacityBg1.style.backgroundImage = ``
          opacityBg1.style.opacity = '1'
          opacityBg0.style.opacity = '0'
          this.activeLayerIndex = 0
        }
      }
    }
  }
})
