/**
 * 歌词解析器
 * 能够处理标准 LRC 以及一行多时间标签的情况
 * 例如: [01:23.00][02:45.00]这句歌词唱了两遍
 */

export interface LyricLine {
  time: number // 开始时间（秒）
  duration: number // 持续时间（秒）
  text: string // 歌词文本
  translation?: string // 翻译文本
  index: number // 行索引
}

export interface ParseResult {
  lines: LyricLine[]
  noTimestamp: boolean // 是否没有时间戳（纯文本歌词）
}

/**
 * 时间格式反序列化
 * @example '01:02.410' => 62.41
 */
function parseTime(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 2) return 0
  const minutes = parseInt(parts[0], 10)
  const seconds = parseFloat(parts[1])
  return minutes * 60 + seconds
}

/**
 * 解析 LRC 格式歌词
 * 切分 -> 过滤 -> 循环提取所有时间 -> 整理 -> 排序
 */
export function parseLRC(lrcStr: string): ParseResult {
  const result: LyricLine[] = []

  // 1. 边界卫士
  if (!lrcStr || !lrcStr.trim()) {
    return { lines: result, noTimestamp: true }
  }

  // 2. 切分字符串 以换行符切 得到lines字符串数组
  const lines = lrcStr.split(/\r?\n/).filter((line) => line.trim())

  // 3. 定义正则 (注意这里加了 'g' 全局匹配)
  // 必须加 'g'，否则 exec 只会匹配第一个，无法处理 [00:01][00:02] 这种情况
  const timeRegex = /\[(\d{1,2}:\d{1,2}(?:[.:]\d{1,3})?)\]/g

  // 4. 逐行处理
  lines.forEach((line, index) => {
    // A. 跳过杂质：JSON 元数据 或 头部标签 [ar:xxx]
    if (line.startsWith('{') || /^\[[a-zA-Z]+:/.test(line)) return

    // B. 准备提取变量
    const timeTags: number[] = [] // 这一行里所有的“肉”
    let match: RegExpExecArray | null //正则匹配的返回值
    let lastIndex = 0 // 记录最后一次匹配结束的位置

    // C. 循环匹配
    // 只要还能在这一行里找到时间标签，就一直找下去
    // [00:01][00:02]歌词 -> 循环两次
    // match内容还是和之前一样，是一个数组 0对应整个[],1对应时间
    while ((match = timeRegex.exec(line)) !== null) {
      // 提取时间 (match[1] 是去皮后的时间串)
      timeTags.push(parseTime(match[1]))
      // 更新标尺位置：现在匹配到了第几个字符？
      // 方便最后把剩下的歌词截取出来
      lastIndex = timeRegex.lastIndex
    }

    // D. 情况 1: 没找到时间标签 (纯文本)
    if (timeTags.length === 0) {
      const text = line.trim()
      if (text) {
        result.push({ time: 0, duration: 0, text, index })
      }
      return
    }

    // E. 情况 2: 找到了 (1个或多个) 时间标签
    // 截取歌词文本：从最后一个标签后面开始切
    const text = line.slice(lastIndex).trim()

    // 哪怕一行有5个时间，我们这里循环5次，
    // 把它们变成5个独立的歌词对象，虽然文字一样，但时间不同。
    for (const time of timeTags) {
      result.push({
        time,
        duration: 0,
        text,
        index // 这里的 index 暂时都是一样的，后面会重置
      })
    }
  })

  // 5. 检查有效性
  // 是不是全都是 0 秒的歌词？
  // 比如有些文件全是文本没有时间轴，这种就不支持滚动
  const hasValidTime = result.some((line) => line.time > 0)
  if (!hasValidTime && result.length > 0) {
    // 虽然不支持滚动，但还是整理一下索引返回去显示
    result.forEach((line, i) => (line.index = i))
    return { lines: result, noTimestamp: true }
  }

  // 6. 排序 (必须！)
  // 因为处理多标签后，result 数组里的时间顺序可能被打乱
  // 比如先 push 了 [02:00] 的，后 push 了 [01:00] 的
  result.sort((a, b) => a.time - b.time)

  // 7. 计算时长 duration 并重置 index
  for (let i = 0; i < result.length; i++) {
    result[i].index = i // 保证 index 0,1,2,3... 连续
    if (i < result.length - 1) {
      // 这一句时长 = 下一句开始 - 这一句开始
      result[i].duration = result[i + 1].time - result[i].time
    } else {
      result[i].duration = 5 // 最后一句默认 5秒
    }
  }

  return { lines: result, noTimestamp: false }
}

/**
 * 合并翻译 (逻辑保持不变)
 */
export function mergeLyricsWithTranslation(
  original: ParseResult,
  translationLrc: string | undefined | null
): LyricLine[] {
  // 如果无翻译字符串，或者或者原歌词本身就是纯文本（没有时间轴),那就没法合并,直接把原歌词原封不动退回去
  if (!translationLrc || !translationLrc.trim() || original.noTimestamp) {
    return original.lines
  }
  // 翻译歌词也是 LRC 格式，直接复用刚才写的 parseLRC 函数把它变成数组
  const translationResult = parseLRC(translationLrc)
  //如果翻译歌词解析出来没东西，或者也是纯文本没时间轴，那也退回原歌词
  if (translationResult.noTimestamp || translationResult.lines.length === 0) {
    return original.lines
  }

  // 把翻译歌词转换成一个 Map,这样可以避免双重for循环
  // Key: 时间 (number) -> Value: 翻译文本 (string)
  // 这样以后查翻译，只需要 O(1) 的时间复杂度
  const translationMap = new Map<number, string>()
  for (const line of translationResult.lines) {
    if (line.text.trim()) {
      translationMap.set(line.time, line.text)
    }
  }
  //定义“容差值”：0.5秒，只要翻译的时间和原歌词的时间相差在 0.5秒 以内，我们就认作是同一句。
  const tolerance = 0.5
  for (const line of original.lines) {
    //精确匹配
    if (translationMap.has(line.time)) {
      line.translation = translationMap.get(line.time)
      continue
    }
    //容差匹配/模糊匹配
    //不得不遍历一下 Map 里的所有翻译，找个时间最近的
    for (const [time, text] of translationMap) {
      if (Math.abs(time - line.time) <= tolerance) {
        line.translation = text
        break
      }
    }
  }

  return original.lines
}
