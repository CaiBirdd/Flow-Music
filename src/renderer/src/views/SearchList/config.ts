import { formattingTime } from '@/utils'
import { GetMusicDetailData, getMusicUrl } from '@/api/musicList'
import { Columns } from '@/components/SongList/index.vue'
import { Bottom } from '@element-plus/icons-vue'
import NotFund from '@/components/NotFund/index.vue'
import { computed, ref, ComputedRef } from 'vue'
import { useUserInfo } from '@/store'

/**
 * 下载弹窗状态
 * 内存优化: 只保存当前正在处理的下载ID，避免状态累积
 */
const downloadVisible = ref<number | null>(null)
const store = useUserInfo()

export const columns: ComputedRef<Columns[]> = computed(() => {
  return [
    {
      title: '#',
      width: '45px',
      type: 'index',
      class: 'empty'
    },

    {
      title: '标题',
      prop: 'name',
      picUrl: 'al.picUrl',
      width: '35%',
      class: 'title',
      type: 'title'
    },
    {
      title: '专辑',
      prop: 'al.name', // 嵌套取值
      width: '20%',
      class: 'album'
    },
    {
      title: '操作',
      width: '45px',
      type: 'handle',
      class: 'handle',
      icon: ['love']
    },
    {
      title: '时长',
      prop: 'dt',
      width: '8%',
      class: 'time',
      processEl(h, data: GetMusicDetailData) {
        return formattingTime(data.dt)
      }
    },
    {
      title: '下载',
      width: '8%',
      hidden: !store.isLogin,
      processEl(h, { id, name }: GetMusicDetailData) {
        return h('div', [
          h(Bottom, {
            style: {
              width: '20px',
              height: '20px',
              cursor: 'pointer'
            },
            async onClick() {
              const { data } = await getMusicUrl(id)
              if (!data[0].url) {
                downloadVisible.value = id
                return
              }
              const url = data[0].url

              fetch(url)
                .then((response) => response.blob())
                .then((blob) => {
                  const link = document.createElement('a')
                  // 创建 Blob URL
                  const blobUrl = URL.createObjectURL(blob)
                  link.href = blobUrl
                  link.download = name + '.mp3'
                  link.click()
                  // 内存优化: 下载完成后释放 Blob URL，防止内存泄漏
                  // 使用 setTimeout 确保下载开始后再释放
                  setTimeout(() => {
                    URL.revokeObjectURL(blobUrl)
                  }, 1000)
                })
            }
          }),
          h(NotFund, {
            // 只有当前ID匹配时才显示弹窗
            modelValue: downloadVisible.value === id,
            'onUpdate:modelValue': (val: boolean) => {
              downloadVisible.value = val ? id : null
            }
          })
        ])
      }
    },
    {
      title: '热度',
      width: '12%',
      processEl(h, data: GetMusicDetailData) {
        return h(
          'div',
          {
            style: {
              overflow: 'hidden',
              height: '6px',
              width: '100%',
              'border-radius': '5px',
              'background-color': '#373737'
            }
          },
          h('div', {
            style: {
              height: '100%',
              'background-color': 'rgba(255,255,255,0.2)',
              width: `${data.pop}%`
            }
          })
        )
      }
    }
  ]
})

export const tabsConfig = [
  {
    name: 'song',
    label: '单曲'
  },
  {
    name: 'singer',
    label: '歌手'
  },
  {
    name: 'album',
    label: '专辑'
  },
  {
    name: 'video',
    label: '视频'
  },
  {
    name: 'songList',
    label: '歌单'
  },
  {
    name: 'lyric',
    label: '歌词'
  },
  {
    name: 'podcast',
    label: '播客'
  },
  {
    name: 'voice',
    label: '声音'
  },
  {
    name: 'user',
    label: '用户'
  }
]
