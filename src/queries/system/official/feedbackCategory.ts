import { Resolver } from 'definitions'

const FEEDBACK_CATEGORIES = [
  {
    id: 1,
    en: '操作異常',
    zh_hant: '操作異常',
    zh_hans: '操作异常'
  },
  {
    id: 2,
    en: '功能建議',
    zh_hant: '功能建議',
    zh_hans: '功能建议'
  },
  {
    id: 3,
    en: '其他',
    zh_hant: '其他',
    zh_hans: '其他'
  }
]

export const feedbackCategory: Resolver = () => FEEDBACK_CATEGORIES
