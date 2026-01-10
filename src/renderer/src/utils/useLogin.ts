import { anonimousLogin, captchaLogin, phoneLogin } from '@/api/login'
import { setCookies } from '@/utils/cookies'
import { ElMessage } from 'element-plus'
import { useUserInfo } from '@/store'
import { getUserPlayListFn } from '@/utils/userInfo'

// 发送验证码
export const sendCodePhone = async (phone: string) => {
  const { data } = await captchaLogin(phone)
  if (data) {
    ElMessage.success('验证码已发送')
  }
}

// 验证码登录
export const codeLogin = async (phone: string, code: string): Promise<any> => {
  const data = await phoneLogin(phone, code)
  const store = useUserInfo()
  store.updateProfile(data.profile)
  ElMessage.success('登录成功')
  localStorage.setItem('token', data.token)
  setCookies(data.cookie)
  getUserPlayListFn()

  return data
}

export const useAnonimousLogin = async () => {
  try {
    const { cookie } = await anonimousLogin()
    if (cookie) {
      localStorage.setItem(`MUSIC_U`, cookie)
    }
  } catch (e) {
    console.error('游客登录失败', e)
  }
}
