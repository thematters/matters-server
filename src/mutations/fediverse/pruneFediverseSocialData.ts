import type { Context } from '#definitions/index.js'

const resolver = async (
  _: unknown,
  {
    input,
  }: {
    input?: {
      retentionDays?: number | null
      maxItems?: number | null
    } | null
  },
  { viewer, dataSources: { federationExportService } }: Context
) =>
  federationExportService.pruneGatewaySocialData({
    operatorId: viewer.id!,
    retentionDays: input?.retentionDays,
    maxItems: input?.maxItems,
  })

export default resolver
