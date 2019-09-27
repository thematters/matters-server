import { FEEDBACK_CATEGORIES } from 'common/enums'
import { OfficialToFeedbackCategoryResolver } from 'definitions'

export const feedbackCategory: OfficialToFeedbackCategoryResolver = (
  parent,
  _,
  { viewer }
) => FEEDBACK_CATEGORIES[viewer.language]
