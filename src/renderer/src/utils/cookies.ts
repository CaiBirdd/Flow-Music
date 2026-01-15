// 封装 Cookie 的读写操作，并实现了一个“双重备份”机制。

// 导出设置 Cookie 的函数
// 参数 string: 预期是一个包含多个 Cookie 的字符串，看起来是用 ";;" 分隔的特殊格式
export function setCookies(string: string) {
  const cookies = string.split(';;')
  cookies.map((cookie) => {
    document.cookie = cookie // 将 Cookie 写入浏览器 Document
    const cookieKeyValue = cookie.split(';')[0].split('=') // 解析 Cookie 的 Key 和 Value 拿到 "key=value" 部分（去掉了后面的 path, expires 等选项）
    localStorage.setItem(`cookie-${cookieKeyValue[0]}`, cookieKeyValue[1]) //同步存入本地
  })
}
