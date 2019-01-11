import { OfficialToFeedbackCategoryResolver } from 'definitions'

const FEEDBACK_CATEGORIES = [
  {
    id: 1,
    name: '操作異常'
  },
  {
    id: 2,
    name: '功能建議'
  },
  {
    id: 3,
    name: '其他'
  }
]

export const feedbackCategory: OfficialToFeedbackCategoryResolver = () =>
  FEEDBACK_CATEGORIES
