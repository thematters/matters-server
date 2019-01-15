import { OfficialToFeedbackCategoryResolver } from 'definitions'
import { FEEDBACK_CATEGORIES } from 'common/enums'

export const feedbackCategory: OfficialToFeedbackCategoryResolver = () =>
  FEEDBACK_CATEGORIES
