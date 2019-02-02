import { OfficialToReportCategoryResolver } from 'definitions'
import { REPORT_CATEGORIES } from 'common/enums'

export const reportCategory: OfficialToReportCategoryResolver = (
  parent,
  _,
  { viewer }
) => REPORT_CATEGORIES[viewer.language]
