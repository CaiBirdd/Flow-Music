import { createPinia } from 'pinia'

const pinia = createPinia()
export default pinia
/*这里拆出来，是为了在非vue文件中使用也能使用pinia的store*/
