import { OfficialToReportCategoryResolver } from 'definitions'
import { REPORT_CATEGORIES } from 'common/enums'

export const reportCategory: OfficialToReportCategoryResolver = () =>
  REPORT_CATEGORIES
