import request from '@/utils/request'

/**
 * 创建新歌单
 * @param name - 歌单标题 (如 "周杰伦精选")
 * @param privacy - 隐私设置
 *                  '10': 隐私歌单（只有自己能看到）
 *                  '': 公开歌单（默认，所有人可见）
 * @param type - 歌单类型
 *               'NORMAL': 普通歌单 (默认)
 *               'VIDEO': 视频歌单
 *               'SHARED': 共享歌单
 * 场景：点击侧边栏“+”号新建歌单时调用
 */
export const createPlaylist = (
  name: number | string,
  privacy: '10' | '' = '',
  type: 'NORMAL' | 'VIDEO' | 'SHARED' = 'NORMAL'
) => request.get(`/playlist/create`, { params: { name, type, privacy } })

// 删除歌单 右键删除  虽然参数是数组，但后端其实通常只处理一个 ID，这里用 join() 拼接成字符串传参
export const deletePlaylist = (ids: string[]) =>
  request.post('/playlist/delete', { id: ids.join() })

// 对歌单添加或删除歌曲  op=add&pid=24381616&tracks=347231
/**
 * @param data - 操作参数对象
 *        {
 *           op: 'add' | 'del',  // 操作指令: add=收藏歌曲到歌单, del=从歌单移出歌曲
 *           pid: number,        // 目标歌单的 ID
 *           tracks: number      // 歌曲 ID
 *        }
 *    在播放器界面点收藏到歌单” -> op='add'
 *    在歌单详情页列表里右键“删除歌曲” -> op='del'
 */
export const updatePlaylistTracks = (data) => request.get('/playlist/tracks', { params: data })
//检查歌曲可用性 看看有没有版权
export const checkMusic = (id: number) => request.post('/check/music', { id })
