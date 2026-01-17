import { anonymousLogin, captchaLogin, phoneLogin } from '@/api/login' // 引入API：游客登录、发验证码、手机登录
import { ElMessage } from 'element-plus'
import { useUserInfo } from '@/store'
import { getUserPlayListFn } from '@/utils/userInfo' // 工具函数：登录后立刻去拉取用户的歌单列表

// 发送验证码
export const sendCodePhone = async (phone: string) => {
  const { data } = await captchaLogin(phone)
  if (data) {
    ElMessage.success('验证码已发送')
  }
}

// 验证码登录
export const codeLogin = async (phone: string, code: string): Promise<any> => {
  try {
    //提交手机号和验证码
    const data = await phoneLogin(phone, code)
    // 登录成功，拿到用户信息(profile)、Token、Cookie
    const store = useUserInfo()
    //更新 Pinia 用户信息状态 (这样界面上的头像、昵称就会变)
    store.updateProfile(data.profile)
    ElMessage.success('登录成功')
    // 存 Token (虽然网易云 API 主要靠 Cookie，但 Token 留着防身)
    localStorage.setItem('token', data.token)
    // 逻辑修正：直接存 MUSIC_U，与扫码登录保持一致
    localStorage.setItem('MUSIC_U', data.cookie)
    getUserPlayListFn() //刷新歌单
    return data
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
    throw error
  }
}

export const useAnonymousLogin = async () => {
  try {
    const { cookie } = await anonymousLogin()
    if (cookie) {
      localStorage.setItem(`MUSIC_U`, cookie)
    }
  } catch (e) {
    console.error('游客登录失败', e)
  }
}
