import { formatDate } from '@/utils'
import { Columns } from '@/components/SongList/index.vue'
import { GetMusicDetailData } from '@/api/musicList'

export const columns: Columns[] = [
  {
    title: '#',
    width: '45px',
    type: 'index',
    class: 'empty',
    style: {
      position: 'relative'
    }
  },
  {
    title: '标题',
    prop: 'name',
    picUrl: 'al.picUrl',
    width: '40%',
    class: 'title',
    type: 'title'
  },
  {
    title: '专辑',
    prop: 'al.name', // 嵌套取值
    width: '25%',
    class: 'album',
    type: 'album'
  },
  {
    title: '操作',
    width: '45px',
    type: 'handle',
    class: 'handle',
    icon: ['love']
  },
  {
    title: '播放时间',
    width: '130px',
    class: 'time',
    processEl: (h, data: GetMusicDetailData) => {
      return formatDate(data.playTime as any, 'MM-DD hh:mm:ss')
    }
  }
]
