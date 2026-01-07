//封装针对歌曲的操作
// “红心喜欢/取消喜欢” 和 “从歌单中删除歌曲”
import { likeMusicApi } from '@/api/musicList'
import { ElMessage } from 'element-plus'
import usePlayList from '@/layout/BaseAside/usePlayList'
import { useMusicAction } from '@/store/music'
import { deleteSong } from '@/api/play'
import { getUserPlayListFn } from '@/utils/userInfo'

export default () => {
  const music = useMusicAction()
  const likeMusic = async (id: number, isLike: boolean = true) => {
    try {
      const data = await likeMusicApi(id, isLike)
      const msg = isLike ? '添加喜欢成功' : '取消喜欢成功'
      const { getPlayListDetailFn } = usePlayList()
      // 获取当前正看着/听着的这个歌单ID
      const playId = music.state.currentItem?.id
      if (playId) {
        getPlayListDetailFn(playId) //当喜欢/删除一首歌后，需要刷新歌单列表，让界面同步更新。
      }
      ElMessage.success(msg)
    } catch (e: any) {
      console.log('e', e.message || e)
    }
  }
  /**
   * @param id 要删除的歌曲 ID
   * @param playId 这首歌所在的歌单 ID
   */
  const deleteSongHandler = async (id: number, playId: number) => {
    const { code, message } = await deleteSong({
      op: 'del', // 操作类型：删除
      pid: playId, // 目标歌单
      tracks: id // 目标歌曲
    })
    if (code && code !== 200) {
      ElMessage.error(message)
      return
    }
    const { getPlayListDetailFn } = usePlayList()
    await getPlayListDetailFn(playId) //刷新歌单中的歌曲
    getUserPlayListFn() //获取用户左侧的歌单列表，用于删除操作后的全局刷新。
    ElMessage.success('删除成功')
  }
  // 目标歌曲 (Target Song)
  return {
    likeMusic,
    deleteSongHandler
  }
}
