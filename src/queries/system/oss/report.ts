import { OSSToReportResolver } from 'definitions'

export const report: OSSToReportResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { systemService } }
) => systemService.findReportById(id)
