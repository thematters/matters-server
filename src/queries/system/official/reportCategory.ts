import { REPORT_CATEGORIES } from 'common/enums'
import { OfficialToReportCategoryResolver } from 'definitions'

export const reportCategory: OfficialToReportCategoryResolver = (
  parent,
  _,
  { viewer }
) => REPORT_CATEGORIES[viewer.language]
