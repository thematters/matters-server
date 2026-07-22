import type { Context } from '#definitions/index.js'

export const fediverseGateway = async (
  _: unknown,
  __: unknown,
  { dataSources: { federationExportService } }: Context
) => federationExportService.loadGatewayDashboard()
