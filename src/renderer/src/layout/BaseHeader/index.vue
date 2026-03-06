<script setup lang="ts" name="Header">
import Search from '@/components/Search/index.vue'
import { handle } from '@/layout/BaseHeader/handle'
import { useFlags } from '@/store/flags'
import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'
import { isElectron } from '@/utils' // 引入工具函数，判断当前是否在 Electron 环境下运行（浏览器环境不显示窗口控制按钮）

const flags = useFlags()
const router = useRouter() //跳转操作
const route = useRoute() //读取路由参数
const { maximize, unmaximize, minimize, close } = handle() //解构出窗口控制方法

//点击最大化/还原按钮时的切换逻辑
const maximizeOrUnmaximize = () => {
  // 如果当前已经是最大化状态，则执行还原；否则执行最大化
  flags.isMaximize ? unmaximize() : maximize()
}
//路由的后退
const back = () => {
  if (backIsDisable.value) {
    return
  }
  router.back()
}
//路由的前进
const go = () => {
  if (goIsDisable.value) {
    return
  }
  router.go(1)
}
// 判断是否禁用“后退”
// 逻辑：如果当前 count 是 1，说明已经在“栈底”（首页），不能再退了
const backIsDisable = computed(() => {
  return +route.query.count! === 1
})
// 判断是否禁用“前进”
// 逻辑：如果当前 count 是最大值，说明已经在“栈顶”，不能再进了
const goIsDisable = computed(() => {
  return +route.query.count! === flags.maxCount
})
//跳转到设置页面
const gotoSetting = () => {
  // 如果此时歌曲详情页是打开的，先关闭它
  flags.isOpenDetail = false
  router.push('/setting')
}
</script>

<template>
  <!--当搜索框打开时，给整个头部添加 no-drag，防止在输入搜索词时误触发窗口拖拽-->
  <div :class="['window-container', { 'no-drag': flags.isOpenSearch }]">
    <!-- 左侧区域：包含前进后退和搜索框 标记为 no-drag 同样确保这些交互元素可点击，不触发拖拽-->
    <div class="left no-drag">
      <div class="flip">
        <el-icon :class="{ disable: backIsDisable }" @click="back"><ArrowLeft /></el-icon>
        <el-icon :class="{ disable: goIsDisable }" @click="go"><ArrowRight /></el-icon>
      </div>
      <!-- 搜索组件 -->
      <Search />
    </div>
    <!-- 中间区域：目前是空的，作为弹性布局的占位符 -->
    <div class="center no-drag"></div>
    <!-- 右侧区域：包含设置按钮和窗口控制按钮。同样标记为 no-drag 以便点击。 -->
    <div class="right no-drag">
      <div class="operator">
        <div class="handler" @click="gotoSetting">
          <el-icon size="20"><Setting /></el-icon>
        </div>
        <template v-if="isElectron()">
          <div class="handler" @click="minimize">
            <i class="iconfont icon-weibiaoti-"></i>
          </div>
          <div class="handler" @click="maximizeOrUnmaximize">
            <i
              :class="['iconfont', flags.isMaximize ? 'icon-3zuidahua-3' : 'icon-3zuidahua-1']"
            ></i>
          </div>
          <div style="margin-right: 13px" class="handler" @click="close">
            <i class="iconfont icon-guanbi"></i>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.window-container {
  height: 90px;
  width: 100%;
  padding-top: 30px;
  padding-bottom: 20px;
  position: relative; // 子元素 的 z-index 小于父元素时，仍然显示在 父元素 上面
  top: 0;
  z-index: auto; //默认层级
  display: flex;
  align-items: center;
  justify-content: space-between;

  .left {
    margin-right: 20%;
    margin-left: 35px;
    display: flex;
    align-items: center;

    .flip {
      display: flex;
      align-items: center;
      margin-right: 15px;
      justify-content: space-between;
      width: 65px;

      .el-icon {
        cursor: pointer;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        width: 27px;
        height: 37px;
        font-weight: 800;

        &.disable {
          cursor: default;
          color: $moreDark;
        }
      }
    }
  }

  //.center {} // Removed empty .center

  .right {
    margin-right: 15px;
    display: flex;
    align-items: center;

    .operator {
      display: flex;
      align-items: center;
      position: relative;
      z-index: 2001; // 这里的层级很高，确保它永远在最上层，能够被点击

      .handler {
        display: flex;
        margin-right: 20px;
        cursor: pointer;
        color: $text;
        &:hover {
          color: rgb(30, 204, 148);
        }
      }
      // [字体图标样式聚合]
      // 这里进行了优化：把散落在外面的 .iconfont 具体类都收拢到了 .iconfont 内部
      .iconfont {
        &.icon-weibiaoti- {
          font-size: 25px;
        }
        &.icon-guanbi {
          font-size: 14px;
        }
        &.icon-3zuidahua-1 {
          font-size: 14px;
        }
      }
    }
  }
}
</style>
