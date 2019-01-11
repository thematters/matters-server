import { Resolver } from 'definitions'

const REPORT_CATEGORIES = [
  {
    id: 1,
    name: '侵權、抄襲'
  },
  {
    id: 2,
    name: '攻擊、侮辱、誹謗、恐嚇他人'
  },
  {
    id: 3,
    name: '鼓吹歧視、仇恨'
  },
  {
    id: 4,
    name: '誤導、欺詐、侵犯隱私'
  },
  {
    id: 5,
    name: '色情、暴力、教唆犯罪或鼓勵自我傷害'
  },
  {
    id: 6,
    name: '假新聞、不實消息、垃圾訊息'
  },
  {
    id: 7,
    name: '冒用他人身份'
  },
  {
    id: 8,
    name: '其他（請填寫原因）'
  }
]

export const reportCategory: Resolver = () => REPORT_CATEGORIES
