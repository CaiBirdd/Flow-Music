<script setup lang="ts">
import { toggleImg } from '@/utils'
import { ref, watch } from 'vue'
import { getCommentMusic, getMusicDetail, GetMusicDetailData } from '@/api/musicList'
import { useRoute, useRouter } from 'vue-router'
import { useFlags } from '@/store/flags'
import Pagination from '@/components/Pagination/index.vue'

interface CommentData {
  comments: any[] // 评论列表数据
  song: GetMusicDetailData | null // 当前评论关联的歌曲详情
  total: number // 评论总数
  pageSize: number // 每页显示 20 条
  currentPage: number // 当前页码
}
const flags = useFlags()
const router = useRouter()
const route = useRoute()
// 当前页码
const page = ref(1)
const commentData = ref<CommentData>({
  comments: [],
  song: null,
  total: 0,
  pageSize: 20,
  currentPage: 1
})
//路由中获取歌曲id
let id = +route.query.id!
const imgEl = ref<HTMLDivElement>() //背景图容器
const bg = ref<string>('') //背景url

// 监听封面图变化 填充到div中
watch(bg, (val) => {
  toggleImg(val).then((img) => {
    if (imgEl.value) {
      imgEl.value.style.backgroundImage = `url(${img.src})`
    }
  })
})
// 获取评论列表
const fetchComments = async (id: number, page: number) => {
  const { data, code } = await getCommentMusic(id, 0, page, 20, 2)
  if (code === 200) {
    commentData.value.comments = data.comments
    commentData.value.total = data.totalCount
  }
}
// 分页切换
const currentChange = (page: number) => {
  commentData.value.currentPage = page
  fetchComments(id, page) // 加载新页评论
}

// [API] 获取歌曲详情 (为了展示顶部的歌曲信息)
const fetchMusicDetail = async (id: number) => {
  const { songs } = await getMusicDetail(String(id))
  commentData.value.song = songs[0]
  bg.value = commentData.value.song.al.picUrl
}
// 初始化函数
function init() {
  fetchComments(id, page.value)
  fetchMusicDetail(id)
}
init()
// [跳转] 点击用户头像/昵称，跳转到用户详情页
const gotoUserDetail = (uid: number) => {
  flags.isOpenDetail = false
  router.push({
    path: '/user-detail',
    query: {
      uid
    }
  })
}
// [路由监听] 如果用户在评论页切换了歌曲，需要重新加载数据
watch(
  () => +route.query.id!,
  (value) => {
    if (route.path === '/comment') {
      id = value
      init()
    }
  }
)
</script>

<template>
  <div class="comment">
    <!-- 只有当歌曲信息加载完成后才显示整个区块 -->
    <div v-if="commentData.song !== null" class="comment-box">
      <!-- 1. 顶部信息区：封面 + 歌名 + 歌手 + 专辑 -->
      <div class="info">
        <div ref="imgEl" class="bg-img"></div>
        <div class="song-info">
          <div class="song-name">{{ commentData.song.name }}</div>
          <div class="singers">
            <div class="singer-info">
              <!-- 遍历歌手列表，用 '/' 分隔 -->
              <span v-for="(item, index) in commentData.song.ar" :key="index"
                >歌手: {{ item.name + (index < commentData.song.ar.length - 1 ? '/' : '') }}</span
              >
            </div>
            <div class="album">专辑: {{ commentData.song.al.name }}</div>
          </div>
        </div>
      </div>
      <!-- 评论内容区 -->
      <div class="comment-content">
        <div class="comment-content-box">
          <div class="title">精彩评论</div>
          <!-- @wheel.stop: 阻止滚轮事件冒泡 (你选择保留了这个特性) -->
          <div class="content" @wheel.stop>
            <!-- 评论列表循环 -->
            <div v-for="item in commentData.comments" :key="item.id" class="content-line">
              <!-- 用户头像 -->
              <div
                :style="{ backgroundImage: `url(${item.user.avatarUrl})` }"
                class="photo"
                @click="gotoUserDetail(item.user.userId)"
              ></div>
              <div class="right-box">
                <!-- 评论主体 -->
                <div class="comment-text">
                  <!-- 用户昵称 -->
                  <div class="name" @click="gotoUserDetail(item.user.userId)">
                    {{ item.user.nickname }}:
                  </div>
                  <!-- 评论文本 -->
                  <div class="text">{{ item.content }}</div>
                </div>
                <!-- 底部数据栏 (时间、点赞、回复等) -->
                <div class="handle-box">
                  <div class="time">{{ item.timeStr }}</div>
                  <div class="operation">
                    <el-icon><Star /></el-icon>
                    <span style="font-size: 12px">{{ item.likedCount }}</span>
                    <div class="operator-line"></div>
                    <el-icon><ChatDotSquare /></el-icon>
                  </div>
                </div>
              </div>
              <!-- 分割线 -->
              <div class="line"></div>
            </div>
          </div>
          <!-- 3. 分页组件 -->
          <pagination
            :total="commentData.total"
            :page-size="commentData.pageSize"
            :current-page="commentData.currentPage"
            @current-change="currentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-tab-pane),
:deep(.el-tabs__content),
:deep(.el-tabs) {
  height: 100%;
}
.comment {
  height: 100%;
  width: 100%;
  .comment-box {
    padding: 0 0 0 35px;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    flex-flow: column;
    height: 100%;
    .info {
      display: flex;
      margin-bottom: 30px;
      .song-info {
        display: flex;
        flex-direction: column;
        font-size: 13px;
        .song-name {
          font-size: 30px;
          margin-bottom: 20px;
        }
        .singers {
          display: flex;
          align-items: center;
          .singer-info {
            display: flex;
            align-items: center;
            margin-right: 20px;
          }
        }
      }
      .bg-img {
        transition: 1s background;
        width: 130px;
        height: 130px;
        border-radius: 10px;
        @extend .bgSetting;
        margin-right: 20px;
      }
    }
    .comment-content {
      :deep(.el-tabs__item) {
        margin-right: 30px;
      }
      .comment-content-box {
        height: 100%;
        margin-bottom: 150px;
        .title {
          font-size: 18px;
          margin-bottom: 5px;
        }
        .content {
          padding-right: 35px;
          .content-line {
            display: flex;
            align-items: center;
            position: relative;
            padding-bottom: 25px;
            width: 100%;
            padding-top: 25px;
            .line {
              position: absolute;
              bottom: 0;
              left: 0;
              height: 1px;
              width: 100%;
              background-color: rgba(255, 255, 255, 0.08);
            }
            .photo {
              cursor: pointer;
              width: 40px;
              height: 40px;
              min-width: 40px;
              min-height: 40px;
              border-radius: 50%;
              background-color: #42b983;
              margin-right: 20px;
              @extend .bgSetting;
            }
            .right-box {
              display: flex;
              flex-direction: column;
              align-content: space-around;
              width: 100%;
              .comment-text {
                display: flex;
                font-size: 13px;
                margin-bottom: 6px;
                .name {
                  color: #0086b3;
                  cursor: pointer;
                  margin-right: 5px;
                }
                .text {
                }
              }
              .handle-box {
                display: flex;
                justify-content: space-between;
                .time {
                  font-size: 13px;
                }
                .operation {
                  position: relative;
                  top: 4px;
                  display: flex;
                  align-items: center;
                  .operator-line {
                    width: 1.5px;
                    height: 15px;
                    background-color: rgba(255, 255, 255, 0.05);
                    margin: 0 10px;
                  }
                  .el-icon {
                    cursor: pointer;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
</style>
