import { OfficialToFeedbackCategoryResolver } from 'definitions'
import { FEEDBACK_CATEGORIES } from 'common/enums'

export const feedbackCategory: OfficialToFeedbackCategoryResolver = (
  parent,
  _,
  { viewer }
) => FEEDBACK_CATEGORIES[viewer.language]
