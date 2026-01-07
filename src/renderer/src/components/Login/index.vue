<script lang="ts" setup>
import { ref, onUnmounted, watch } from 'vue'
import { loginQrCheck, loginQrCreate, loginQrKey } from '@/api/login'
import { ElMessage } from 'element-plus'
import { getUserAccountFn } from '@/utils/userInfo'
import { sendCodePhone, codeLogin } from '@/utils/useLogin'
import { useFlags } from '@/store/flags'

const flags = useFlags()

const key = ref('')
const qrUrl = ref('')
const flag = ref(false) // 是否授权中
const isSucceed = ref(false)
let timer: NodeJS.Timeout
const mode = ref<'qr' | 'phone'>('qr')
// 原代码: const passVisible = ref(true) - 已删除，未使用
const phoneNumber = ref('') // 手机号输入
const isPhoneValid = ref(false) // 手机号是否有效
const sendCodeLoading = ref(false)
const isSendCode = ref(false)
const otp = ref('')
const otpLoading = ref(false)

const init = async () => {
  const {
    data: { unikey }
  } = await loginQrKey()
  key.value = unikey
  const {
    data: { qrimg }
  } = await loginQrCreate(key.value, true)
  qrUrl.value = qrimg

  timer = setInterval(async () => {
    // 800二维码不存在或已过期 801等待扫码  802授权中 803授权登陆成功
    // 原代码: const { code, message, cookie } - message未使用已删除
    const { code, cookie } = await loginQrCheck(key.value)
    if (code === 800) {
      clearInterval(timer)
      init()
    } else if (code === 802) {
      flag.value = true
    } else if (code === 803) {
      clearInterval(timer)
      isSucceed.value = true
      localStorage.setItem(`MUSIC_U`, cookie)
      ElMessage.success('授权登陆成功')
      flags.isOpenLogin = false
      getUserAccountFn()
    }
  }, 3000)
  return timer
}

const close = () => {
  clearInterval(timer)
}

const setMode = (val: 'qr' | 'phone') => {
  mode.value = val
}

// 手机号格式验证函数
const validatePhone = (phone: string) => {
  // 中国手机号格式：1开头的11位数字
  const phoneRegex = /^1[3-9]\d{9}$/
  return phoneRegex.test(phone)
}

// 监听手机号输入变化
const handlePhoneInput = (value: string) => {
  console.log(value)
  phoneNumber.value = value
  isPhoneValid.value = validatePhone(value)
}

const sendCode = async () => {
  otp.value = ''
  try {
    isSendCode.value = true
    sendCodeLoading.value = true
    await sendCodePhone(phoneNumber.value)
  } catch {
    isSendCode.value = false
  } finally {
    sendCodeLoading.value = false
  }
}

const handleOtpFinish = async (value: string) => {
  try {
    otpLoading.value = true
    await codeLogin(phoneNumber.value, value)
    flags.isOpenLogin = false
    close()
  } catch {
    // 登录失败，用户可以重试（原代码为空catch块）
  } finally {
    otpLoading.value = false
  }
}

watch(
  () => flags.isOpenLogin,
  (val) => {
    if (val) {
      init()
    } else {
      close()
    }
  }
)

onUnmounted(() => {
  clearInterval(timer)
})
</script>

<template>
  <v-dialog
    v-model="flags.isOpenLogin"
    scrim="rgba(0,0,0,1)"
    width="auto"
    :persistent="true"
    @update:model-value="close"
  >
    <v-card v-if="mode === 'qr'" title="扫码登录" class="relative">
      <!-- 右上角关闭按钮 -->
      <!-- 原代码: @click="() => { dialogVisible = false; close(dialogVisible) }" -->
      <!-- 简化为直接设置 dialogVisible，关闭会由 @update:model-value 触发 -->
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        class="close-btn"
        @click="flags.isOpenLogin = false"
      />

      <div class="login-container">
        <img v-if="!flag" id="qr-img" :src="qrUrl" alt="" />
        <h1 v-else>{{ isSucceed ? '授权登陆成功' : '授权中...' }}</h1>

        <div class="desc">使用网易云音乐APP扫码登录</div>

        <v-card-text class="text-center">
          <a
            class="text-blue text-decoration-none"
            rel="noopener noreferrer"
            style="cursor: pointer"
            @click="setMode('phone')"
          >
            选用手机号登录<v-icon icon="mdi-chevron-right"></v-icon>
          </a>
        </v-card-text>
      </div>
      <template #actions> </template>
    </v-card>
    <v-card
      v-else
      width="400"
      class="mx-auto pa-12 pb-8 relative"
      elevation="8"
      max-width="448"
      rounded="lg"
    >
      <!-- 右上角关闭按钮 -->
      <!-- 原代码: @click="() => { dialogVisible = false; close(dialogVisible) }" -->
      <!-- 简化为直接设置 dialogVisible，关闭会由 @update:model-value 触发 -->
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        class="close-btn"
        @click="flags.isOpenLogin = false"
      />

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

      <template v-else>
        <!-- 左上角返回按钮 -->
        <v-btn
          icon="mdi-arrow-left"
          variant="text"
          size="small"
          class="back-btn"
          @click="isSendCode = false"
        />

        <v-sheet width="100%">
          <h3 class="text-h6 mb-1">手机验证</h3>

          <div class="text-body-2 font-weight-light">
            输入刚刚发送到你手机号的验证码
            <span class="font-weight-black text-primary">{{ phoneNumber }}</span>
          </div>

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
      <v-card-text class="text-center">
        <a
          class="text-blue text-decoration-none"
          rel="noopener noreferrer"
          style="cursor: pointer; display: flex; align-content: center; justify-content: center"
          @click="setMode('qr')"
        >
          扫码登录<v-icon icon="mdi-chevron-right"></v-icon>
        </a>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>

<style lang="scss">
.el-dialog.login {
  /*
   * backdrop-filter 性能优化:
   * 降低blur值并添加GPU加速提示
   */
  backdrop-filter: blur(40px) saturate(180%);
  background-color: rgba(40, 40, 40, 0.7);
  will-change: backdrop-filter;
  transform: translate3d(0, 0, 0);

  .el-dialog__title {
    color: $text;
  }
  .el-dialog__body {
    display: flex;
    justify-content: center;
  }
}
</style>
<style scoped lang="scss">
.login-container {
  //display: flex;
  //flex-wrap: wrap;
  //align-items: center;
  //justify-content: center;
  width: 400px;
  display: grid;
  row-gap: 10px;
  grid-template-columns: repeat(1, auto);
  place-items: center;

  .desc {
    font-size: 12px;
  }
}

.phone-input-container {
  // 当有错误信息时，增加底部间距
  :deep(.v-messages__message) {
    margin-bottom: 16px;
  }
}

// 关闭按钮样式
.close-btn {
  position: absolute !important;
  top: 8px;
  right: 8px;
  z-index: 10;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

// 返回按钮样式
.back-btn {
  position: absolute !important;
  top: 8px;
  left: 8px;
  z-index: 10;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
