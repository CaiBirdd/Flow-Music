<script lang="ts" setup>
import { toggleImg } from '@/utils'
import type { LyricLine } from '@/utils/lyric'
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import gsap from 'gsap'
import { useRouter } from 'vue-router'
import { useFlags } from '@/store/flags'

/**
 * LyricDisplay 组件
 *
 * 作用：
 * 1. 音乐详情页的核心容器，展示歌曲信息（标题、歌手）。
 * 2. 处理封面图的平滑切换与缩放动画 (GSAP)。
 * 3. 作为歌词渲染的"宿主"容器 (.lyric-container)，实际歌词逻辑由 MusicPlayer 组件挂载。
 * 4. 极致的性能优化：包含休眠机制、硬件加速、防竞态处理。
 */

interface Props {
  lyric: LyricLine[] // 歌词数据（虽然本组件不直接用，但用来判断是否显示）
  title: string // 歌名
  bg?: string // 封面图 URL
  ar: any[] // 歌手数组
  videoPlayUrl: string | null // 动态视频封面 URL
}

// 默认 Props 设置
const props = defineProps<Props>()

const router = useRouter()
const flash = useFlags() // 全局状态：用于检测详情页是否打开

// 视频元素引用
const videoCover = useTemplateRef<HTMLVideoElement>('videoCover')

// GSAP动画实例，用于清理上一个动画防止累积
// 必须在组件卸载或切歌时清理，否则会造成内存泄漏和动画冲突
let currentTimeline: gsap.core.Timeline | null = null

// 保存 DOM 引用，供唤醒时使用
// 使用 useTemplateRef (Vue 3.5+) 替代 document.querySelector，更安全且符合组件化原则
const bgElRef = useTemplateRef<HTMLDivElement>('bgElRef') // 封面容器（负责尺寸动画）

const coverImage = ref('')

// 用于追踪当前加载的图片URL，防止竞态条件 (Race Condition)
// 场景：用户快速切换 A -> B -> C，如果 A 的图片加载很慢，最后才回来，会导致封面显示错误。
let currentLoadingBg: string | null = null

/**
 * 执行封面动画和图片加载
 * @param val 图片URL
 * @param immediate 是否立即显示
 *    - false (切歌时): 执行 "缩小 -> 加载 -> 放大" 的完整动画
 *    - true (唤醒时): 直接显示最终状态，跳过动画，避免用户感到拖沓
 */
const executeCoverAnimation = (val?: string, immediate: boolean = false) => {
  if (!bgElRef.value || !val) return

  // 1. 锁定当前请求 ID
  currentLoadingBg = val

  // 2. 清理旧动画
  if (currentTimeline) {
    currentTimeline.kill()
  }

  // 3. 创建新的 GSAP 时间轴
  currentTimeline = gsap.timeline()

  // 4. 如果不是立即显示，先执行"缩小"动画 (15vh)
  // 这会给用户一种"旧碟片收回去，新碟片拿出来"的视觉暗示
  if (!immediate) {
    currentTimeline.to(bgElRef.value, {
      height: '15vh',
      width: '15vh',
      duration: 0.5,
      ease: 'power1.out',
      transformOrigin: 'center'
    })
  }

  // 5. 异步加载图片
  toggleImg(val, '600y600').then((img) => {
    /**
     * 【竞态条件防御】
     * 关键检查：图片加载回来了，但 currentLoadingBg 还是我当初请求的那个吗？
     * 如果不是，说明在加载期间用户又切歌了，直接丢弃这次结果。
     */
    if (currentLoadingBg !== val) {
      return
    }

    if (!currentTimeline) return

    /**
     * 【唤醒模式 / Immediate 优化】
     *
     * 如果是唤醒模式，不需要动画，直接啪一下把图贴上去，尺寸设为最大。
     */
    if (immediate && !props.videoPlayUrl) {
      coverImage.value = `url(${img.src})`
      bgElRef.value!.style.height = '45vh'
      bgElRef.value!.style.width = '45vh'
      return
    }

    // 6. 执行"放大"动画 (45vh) 并设置背景图
    currentTimeline.to(bgElRef.value, {
      height: '45vh',
      width: '45vh',
      duration: 0.3,
      ease: 'power1.out',
      transformOrigin: 'center',
      onStart: () => {
        // 在动画开始的一瞬间设置背景图，确保放大的过程是有图的
        if (!props.videoPlayUrl) {
          coverImage.value = `url(${img.src})`
        }
      }
    })
  })
}

nextTick(() => {
  // 监听播放状态，控制视频封面播放/暂停
  watch(
    () => window.$audio?.isPlay,
    (value) => {
      if (!props.videoPlayUrl) {
        return
      }
      if (!value) {
        videoCover.value?.pause()
      } else {
        videoCover.value?.play()
      }
    }
  )

  /**
   * 监听封面 URL 变化 (即 切歌)
   */
  watch(
    () => props.bg,
    async (val) => {
      // 移除冗余检查，executeCoverAnimation 内部已有检查

      /**
       * 【性能优化 - 休眠机制 (Sleep Implementation)】
       * 问题：MusicDetail 组件只是被 CSS 移出了屏幕 (transform)，并没有被 Vue 销毁。
       *       这意味着如果后台一直在通过 watch 加载大图、跑 GSAP 动画，会极度浪费 CPU/内存。
       *
       * 策略：
       * 1. 当详情页关闭 (!isOpenDetail) 时：
       *    直接 Kill 掉所有动画，不加载大图，不做任何渲染。
       * 2. 当详情页打开时：
       *    正常执行渲染。
       */
      if (!flash.isOpenDetail) {
        if (currentTimeline) {
          currentTimeline.kill()
          currentTimeline = null
        }
        return
      }

      // 正常模式：执行完整动画
      executeCoverAnimation(val)
    },
    { immediate: true }
  )

  /**
   * 【唤醒机制 (Wake-up Implementation)】
   * 监听详情页打开状态。
   * 场景：用户在后台切了 10 首歌 (触发了上面的休眠)，现在打开详情页。
   * 此时界面上可能还是第 1 首歌的封面，或者什么都没有。
   *
   * 动作：检测到打开时，强制执行一次渲染 (immediate=true)，把最新的封面补上去。
   */
  watch(
    () => flash.isOpenDetail,
    (isOpen) => {
      if (isOpen && props.bg) {
        executeCoverAnimation(props.bg, true)
      }
    }
  )
})
/**
 * 歌手名格式化
 * 例如：[{name: '周杰伦'}, {name: '阿信'}] => "周杰伦/阿信"
 */
const arNames = computed(() => {
  return props.ar.map((item) => item.name).join('/')
})

/**
 * 跳转到歌手搜索页
 */
const handleSearchClick = () => {
  flash.isOpenDetail = false
  router.push({
    path: `/search`,
    query: {
      key: props.title + '-' + arNames.value
    }
  })
}
</script>

<template>
  <div class="shadow">
    <div class="lyric-and-bg-container">
      <div
        ref="bgElRef"
        class="cover-container"
        :style="{ transform: props.lyric.length ? '' : 'translateX(0)' }"
      >
        <!-- 封面容器 对应 JS 中的 bgElRef，用于 GSAP 执行缩放/放大动画。-->
        <!-- transform的逻辑是 没有歌词让封面固定在中间-->
        <div class="title" @click="handleSearchClick">
          {{ props.title }} -
          <span v-for="(item, index) in props.ar" :key="item.id"
            >{{ item.name }} <span v-if="props.ar.length - 1 !== index">/</span></span
          >
        </div>
        <video
          v-if="props.videoPlayUrl"
          ref="videoCover"
          class="video-cover"
          autoplay
          loop
          muted
          :src="props.videoPlayUrl || undefined"
        ></video>
        <!-- 
          静态图片封面 (.img-cover)
          优化：
          1. 使用 v-else 与上面的 video 形成互斥，DOM 结构更清晰。
          2. 使用 :style 绑定响应式变量 coverImage，替代原本的 imperative DOM 操作。
        -->
        <div v-else class="img-cover" :style="{ backgroundImage: coverImage }" />
      </div>

      <div v-show="props.lyric.length" class="lyric-container"></div>
    </div>
  </div>
</template>

<style scoped lang="scss">
/*
 * 歌词显示层性能优化说明:
 * 2. 使用 contain 属性隔离重绘范围
 * 3. 使用 transform: translate3d 开启GPU合成层
 */
.shadow {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  /* GPU加速优化 */
  transform: translate3d(0, 0, 0);
  /* 限制重绘范围 */
  contain: layout style;

  .lyric-and-bg-container {
    display: flex;
    margin-top: 17vh;
    justify-content: space-evenly;
    align-items: center;
    height: 58vh;
    /* 优化: 仅对transform属性使用过渡，避免触发全属性过渡 */
    transition: transform 1s ease-out;

    .cover-container {
      width: 45vh;
      transform-origin: center;
    }

    .title {
      font-size: 25px;
      font-weight: 500;
      width: 100%;
      cursor: pointer;
      @include textOverflow(1);
    }

    .video-cover {
      height: 100%;
      width: 100%;
      border-radius: 5px;
    }

    .img-cover {
      height: 100%;
      width: 100%;
      border-radius: 5px;
      /* 优化: 仅对背景图属性使用过渡，避免重绘整个盒子 */
      transition: background-image 0.8s ease-out;
      @extend .bgSetting;
    }

    .lyric-container {
      height: 145%;
      width: 42vw;
      border-radius: 5px;
      overflow: auto;

      /* 
       * 歌词遮罩效果 (Fade In/Out)学两个是为了浏览器兼容
       * 上下各保留 10% 的透明渐变，让歌词滚动时有"消失在虚空中"的感觉
       * to bottom 方向：从上往下画 
         transparent  0% 处：完全透明 (歌词看不见)
         black 10% 10% 处：全黑/完全不透明 (歌词完全显示)
         black 90% 90% 处：全黑/完全不透明 (歌词完全显示)
         transparent 100% 处：完全透明 (歌词看不见) 
      */
      mask-image: linear-gradient(to bottom, transparent, black 10%, black 90%, transparent);
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent,
        black 10%,
        black 90%,
        transparent
      );

      position: relative;

      /* 
       * 滚动性能优化: 
       * 告诉浏览器这个盒子里的滚动位置会经常变，请做好准备
       */
      will-change: scroll-position;
      contain: layout style;
    }
  }
}
</style>
