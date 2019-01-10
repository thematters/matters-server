import { Resolver } from 'definitions'

const REPORT_CATEGORIES = [
  {
    id: 1,
    en: '侵權、抄襲',
    zh_hant: '侵權、抄襲',
    zh_hans: '侵权、抄袭'
  },
  {
    id: 2,
    en: '攻擊、侮辱、誹謗、恐嚇他人',
    zh_hant: '攻擊、侮辱、誹謗、恐嚇他人',
    zh_hans: '攻击、侮辱、诽谤、恐吓他人'
  },
  {
    id: 3,
    en: '鼓吹歧視、仇恨',
    zh_hant: '鼓吹歧視、仇恨',
    zh_hans: '鼓吹歧视、仇恨'
  },
  {
    id: 4,
    en: '誤導、欺詐、侵犯隱私',
    zh_hant: '誤導、欺詐、侵犯隱私',
    zh_hans: '误导、欺诈、侵犯隐私'
  },
  {
    id: 5,
    en: '色情、暴力、教唆犯罪或鼓勵自我傷害',
    zh_hant: '色情、暴力、教唆犯罪或鼓勵自我傷害',
    zh_hans: '侵权、抄袭'
  },
  {
    id: 6,
    en: '假新聞、不實消息、垃圾訊息',
    zh_hant: '假新聞、不實消息、垃圾訊息',
    zh_hans: '假新闻、不实消息、垃圾讯息'
  },
  {
    id: 7,
    en: '冒用他人身份',
    zh_hant: '冒用他人身份',
    zh_hans: '冒用他人身份'
  },
  {
    id: 8,
    en: '其他（請填寫原因）',
    zh_hant: '其他（請填寫原因）',
    zh_hans: '其他（请填写原因）'
  }
]

export const reportCategory: Resolver = () => REPORT_CATEGORIES
