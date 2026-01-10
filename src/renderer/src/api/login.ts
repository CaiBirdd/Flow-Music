import request from '../utils/request'
import { GetUserAccountRes } from '@/api/user'
//手机号登录类型接口
interface PhoneLoginRes extends GetUserAccountRes {
  token: string
  cookie: string
}
//二维码登录类型接口
interface LoginQrCheckRes {
  code: 800 | 801 | 802 | 803 | number
  cookie: string
  message: '授权中' | '等待扫码' | '授权登陆成功' | '二维码不存在或已过期' | string
  avatarUrl?: string
  nickname?: string
}

// 发送手机验证码
export const captchaLogin = (phone: string) =>
  request.post<{ code: number; data: boolean }>('/captcha/sent', { phone })

// 手机验证码登录
export const phoneLogin = (phone: string, captcha: string) =>
  request.post<PhoneLoginRes>('/login/cellphone', { phone, captcha })

// === 二维码登录流程 (Key -> Create -> Check) ===
/**
 * 获取二维码 Key
 * 第一步：先请求一个唯一的 key，用于后续生成和验证
 */
export const loginQrKey = () =>
  request.get<{ code: number; data: { code: number; unikey: string } }>('/login/qr/key')

/**
 * 生成二维码图片信息
 * @param key - 上一步获取的 unikey
 * @param qrimg - 是否返回 base64 图片数据 (true)
 * 第二步：拿着 key 去换二维码图片的 base64 字符串
 */
export const loginQrCreate = (key: string, qrimg?: boolean) =>
  request.get<{ code: number; data: { qrimg: string; qrurl: string } }>('/login/qr/create', {
    params: { key, qrimg }
  })

/**
 * 轮询检测二维码状态
 * @param key - 二维码的 key
 * 第三步：前端定时器每隔几秒调一次这个接口，看用户扫没扫
 * 注意：这里传了 `noCookie=true`，因为轮询时我们还没登录，不需要带旧 cookie
 */
export const loginQrCheck = (key: string) =>
  request.get<LoginQrCheckRes>(`/login/qr/check?key=${key}&noCookie=true`)

// ================= 其他登录方式 =================
/**
 * 获取当前的登录状态
 * 场景：打开 App 时检查之前保存的 cookie 还有没有效
 */
// 获取登录状态
export const loginStatus = (cookie: string) => request.post('/login/status', { cookie })

// 游客登陆 会生成一个临时的游客 cookie
export const anonimousLogin = () => request.post('/register/anonimous')
