<script lang="ts" setup>
import { ref, onUnmounted, watch } from 'vue'
import { loginQrCheck, loginQrCreate, loginQrKey } from '@/api/login'
import { ElMessage } from 'element-plus'
import { getUserAccountFn } from '@/utils/userInfo'
import { sendCodePhone, codeLogin } from '@/utils/useLogin'
import { useFlags } from '@/store/flags'

const flags = useFlags()
const mode = ref<'qr' | 'phone'>('qr')

// =====================
// 二维码登录逻辑封装
// =====================
// 把“如何获取二维码、如何轮询、状态怎么变”完全封装在内部
// 外部只需要调用 getQrCode() 和绑定 qrStatus 状态即可
const useQrCodeLogin = () => {
  const qrKey = ref('') // 二维码的唯一 Key
  const qrUrl = ref('') // 二维码图片的 Base64 数据
  // 定义状态 loading(加载中) -> waiting(等待扫码) -> scanning(已扫码) -> success(成功) -> expired(过期)
  const qrStatus = ref<'loading' | 'waiting' | 'scanning' | 'success' | 'expired'>('loading')
  let qrTimer: NodeJS.Timeout | null = null // 轮询定时器引用

  // 获取Key并生成二维码
  const getQrCode = async () => {
    try {
      qrStatus.value = 'loading'
      // 第一步：请求一个唯一的 Key
      const {
        data: { unikey }
      } = await loginQrKey()
      qrKey.value = unikey
      // 第二步：使用 Key 获取二维码图片数据 (qrimg=true 返回 base64)
      const {
        data: { qrimg }
      } = await loginQrCreate(qrKey.value, true)
      qrUrl.value = qrimg
      qrStatus.value = 'waiting' // 图片获取成功，等待用户扫码

      // 第三步：开始轮询检查扫码状态
      startCheck()
    } catch (e) {
      ElMessage.error('获取二维码失败，请重试')
    }
  }

  // 轮询检查状态
  const startCheck = () => {
    stopCheck() // 启动前先清理旧定时器，防止多重轮询
    qrTimer = setInterval(async () => {
      try {
        const { code, cookie } = await loginQrCheck(qrKey.value)
        // 800:过期 801:等待扫码 802:授权中 803:成功
        if (code === 800) {
          qrStatus.value = 'expired'
          stopCheck() // 停止轮询
          getQrCode() // 过期自动刷新
        } else if (code === 802) {
          //已扫码但未在手机确认
          qrStatus.value = 'scanning'
        } else if (code === 803) {
          qrStatus.value = 'success'
          stopCheck()
          ElMessage.success('授权登录成功')

          // 登录成功后的收尾工作
          localStorage.setItem('MUSIC_U', cookie) // 保存 Cookie 到 localStorage，供 request.ts 拦截器使用
          flags.isOpenLogin = false //关登录弹窗
          getUserAccountFn() //刷新用户信息和歌单
        }
      } catch (e) {
        // 网络错误等静默处理，继续轮询
      }
    }, 3000)
  }

  // 停止轮询
  const stopCheck = () => {
    if (qrTimer) {
      clearInterval(qrTimer)
      qrTimer = null
    }
  }

  return {
    qrUrl,
    qrStatus,
    getQrCode,
    stopCheck
  }
}

// 初始化 Hook
const { qrUrl, qrStatus, getQrCode, stopCheck } = useQrCodeLogin()

// =====================
// 手机验证码登录逻辑
// =====================
const phoneNumber = ref('') // 用户输入的手机号
const isPhoneValid = ref(false) // 手机号格式是否有效
const sendCodeLoading = ref(false) // 发送验证码按钮的 loading 状态
const isSendCode = ref(false) // 是否已发送验证码 (控制面板切换)
const otp = ref('') // 用户输入的验证码
const otpLoading = ref(false) // 验证码登录按钮的 loading 状态

// 简单的手机号正则校验 (1开头，第二位3-9，后面9位数字)
const validatePhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone)

// 处理手机号输入，实时校验
const handlePhoneInput = (value: string) => {
  phoneNumber.value = value
  isPhoneValid.value = validatePhone(value)
}
// 发送验证码逻辑
const sendCode = async () => {
  otp.value = '' // 清空旧的验证码输入
  try {
    isSendCode.value = true // 切换到输入验证码的面板
    sendCodeLoading.value = true
    await sendCodePhone(phoneNumber.value)
  } catch {
    isSendCode.value = false // 发送失败则退回手机号输入面板
  } finally {
    sendCodeLoading.value = false
  }
}
// 用户输完验证码后的回调
const handleOtpFinish = async (value: string) => {
  try {
    otpLoading.value = true
    await codeLogin(phoneNumber.value, value)
    flags.isOpenLogin = false
    stopCheck() // 登录成功也要记得停掉二维码轮询
  } catch {
    // 错误已在 codeLogin 工具函数中被捕获并提示
  } finally {
    otpLoading.value = false
  }
}

// =====================
// 全局状态联动
// =====================
const setMode = (val: 'qr' | 'phone') => {
  mode.value = val
}

// 弹窗关闭时清理逻辑
const handleClose = () => {
  stopCheck()
  flags.isOpenLogin = false
}

// 监听弹窗打开状态，控制轮询启停
watch(
  () => flags.isOpenLogin,
  (val) => {
    if (val) {
      // 只有在二维码模式下才启动轮询获取二维码
      if (mode.value === 'qr') getQrCode()
    } else {
      stopCheck()
      // 弹窗关闭 -> 停止轮询，重置手机登录表单状态
      isSendCode.value = false
      otp.value = ''
    }
  }
)

// 监听模式切换
watch(mode, (val) => {
  // 如果切回扫码模式，且二维码还没加载，则加载一次
  if (val === 'qr' && flags.isOpenLogin) {
    getQrCode()
  }
})
// 组件销毁前，确保停止轮询，防止内存泄漏
onUnmounted(() => {
  stopCheck()
})
</script>

<template>
  <!-- 登录弹窗容器 -->
  <v-dialog
    v-model="flags.isOpenLogin"
    scrim="rgba(0,0,0,1)"
    width="auto"
    :persistent="true"
    @update:model-value="handleClose"
  >
    <!-- Card 1: 扫码登录 -->
    <v-card v-if="mode === 'qr'" title="扫码登录" class="relative">
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        class="icon-btn close-pos"
        @click="handleClose"
      />

      <div class="login-container">
        <!-- 二维码显示区域 根据 qrStatus 显示不同内容-->
        <div class="qr-wrapper">
          <!-- 状态: 等待中或加载中 -> 显示二维码图片 -->
          <img
            v-if="qrStatus === 'waiting' || qrStatus === 'loading'"
            :src="qrUrl"
            alt="二维码"
            class="qr-img"
          />
          <!-- 状态: 已扫码 -> 显示提示文字 -->
          <div v-else-if="qrStatus === 'scanning'" class="status-text">
            <h3>扫描成功</h3>
            <p>请在手机上确认登录</p>
          </div>
          <!-- 状态: 登录成功 -> 显示绿色对勾 -->
          <div v-else-if="qrStatus === 'success'" class="status-text">
            <v-icon icon="mdi-check-circle" color="green" size="64"></v-icon>
            <h3>登录成功</h3>
          </div>
          <!-- 状态: 已过期 -> 点击刷新 -->
          <div v-else-if="qrStatus === 'expired'" class="status-text" @click="getQrCode">
            <v-icon icon="mdi-refresh" size="48"></v-icon>
            <p>二维码已过期，点击刷新</p>
          </div>
        </div>

        <div class="desc">使用网易云音乐APP扫码登录</div>

        <!-- 切换到手机登录链接 -->
        <v-card-text class="text-center">
          <a class="switch-link" @click="setMode('phone')">
            选用手机号登录<v-icon icon="mdi-chevron-right"></v-icon>
          </a>
        </v-card-text>
      </div>
    </v-card>

    <!-- Card 2: 手机号登录 -->
    <v-card
      v-else
      width="400"
      class="mx-auto pa-12 pb-8 relative"
      elevation="8"
      max-width="448"
      rounded="lg"
    >
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        class="icon-btn close-pos"
        @click="handleClose"
      />

      <!-- 输入手机号面板 -->
      <template v-if="!isSendCode">
        <div class="text-subtitle-1 text-medium-emphasis">手机号</div>
        <div class="phone-input-container">
          <v-text-field
            v-model="phoneNumber"
            density="compact"
            placeholder="请输入手机号"
            prepend-inner-icon="mdi-phone-outline"
            variant="outlined"
            :rules="[
              (v) => !!v || '请输入手机号',
              (v) => validatePhone(v) || '请输入正确的手机号格式'
            ]"
            @update:model-value="handlePhoneInput"
          ></v-text-field>
        </div>
        <v-btn
          :disabled="!isPhoneValid"
          :loading="sendCodeLoading"
          class="mb-8"
          color="blue"
          size="large"
          variant="tonal"
          block
          @click="sendCode"
        >
          获取验证码
        </v-btn>
      </template>

      <!-- 输入验证码面板 -->
      <template v-else>
        <!-- 返回上一步按钮 -->
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          size="small"
          class="icon-btn back-pos"
          @click="isSendCode = false"
        />

        <v-sheet width="100%">
          <h3 class="text-h6 mb-1">手机验证</h3>
          <div class="text-body-2 font-weight-light">
            输入刚刚发送到你手机号的验证码
            <span class="font-weight-black text-primary">{{ phoneNumber }}</span>
          </div>
          <!-- 验证码输入框 -->
          <v-otp-input
            v-model="otp"
            divider=" "
            :length="4"
            :loading="otpLoading"
            @finish="handleOtpFinish"
          ></v-otp-input>

          <div class="mt-3 mb-6"></div>
          <div style="margin-bottom: 10px" class="text-caption">
            没有收到验证码? <a href="#" @click.prevent="sendCode">发送</a>
          </div>
        </v-sheet>
      </template>
      <!-- 切换回扫码登录链接 -->
      <v-card-text class="text-center">
        <a class="switch-link align-justify-center" @click="setMode('qr')">
          扫码登录<v-icon icon="mdi-chevron-right"></v-icon>
        </a>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style scoped lang="scss">
// 登录卡片容器布局
.login-container {
  width: 400px;
  display: grid;
  row-gap: 10px;
  grid-template-columns: repeat(1, auto);
  place-items: center;

  .desc {
    font-size: 12px;
  }
}
// 二维码区域样式，固定高度防止抖动
.qr-wrapper {
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.status-text {
  text-align: center;
}

// 调整输入框错误提示的间距
.phone-input-container {
  :deep(.v-messages__message) {
    margin-bottom: 16px;
  }
}

// 复用样式 统一图标按钮
.icon-btn {
  position: absolute !important;
  z-index: 10;
  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
.close-pos {
  top: 8px;
  right: 8px;
}
.back-pos {
  top: 8px;
  left: 8px;
}

.switch-link {
  color: #2196f3; // text-blue
  text-decoration: none;
  cursor: pointer;
  &.align-justify-center {
    display: flex;
    align-content: center;
    justify-content: center;
  }
}
</style>
