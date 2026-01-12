//封装针对歌曲的操作
// “红心喜欢/取消喜欢” 和 “从歌单中删除歌曲”
import { likeMusicApi } from '@/api/musicList'
import { ElMessage } from 'element-plus'
import { useMusicAction } from '@/store/music'
import { updatePlaylistTracks } from '@/api/playlist'
import { getUserPlayListFn } from '@/utils/userInfo'
import { useUserInfo } from '@/store'

export default () => {
  const music = useMusicAction()
  const likeMusic = async (id: number, isLike: boolean = true) => {
    try {
      await likeMusicApi(id, isLike)
      const msg = isLike ? '添加喜欢成功' : '取消喜欢成功'

      // 刷新红心列表
      const store = useUserInfo()
      store.refreshLikedSongs()

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
    const { code, message } = await updatePlaylistTracks({
      op: 'del', // 操作类型：删除
      pid: playId, // 目标歌单
      tracks: id // 目标歌曲
    })
    if (code && code !== 200) {
      ElMessage.error(message)
      return
    }
    // 乐观更新：直接从当前视图中移除该歌曲，无需重新加载
    if (music.state.viewingPlaylist?.id === playId && music.state.viewingPlaylist.tracks) {
      const newTracks = music.state.viewingPlaylist.tracks.filter((track) => track.id !== id)
      music.updateViewingPlaylist({ ...music.state.viewingPlaylist, tracks: newTracks })
    }

    getUserPlayListFn() //获取用户左侧的歌单列表，用于删除操作后的全局刷新，如果删的是歌单第一首会改变封面图。
    ElMessage.success('删除成功')
  }
  // 目标歌曲 (Target Song)
  return {
    likeMusic,
    deleteSongHandler
  }
}
