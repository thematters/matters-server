import type { Context } from '#definitions/index.js'

const resolver = async (
  _: unknown,
  { input: { id, reason } }: { input: { id: string; reason?: string | null } },
  { viewer, dataSources: { federationExportService } }: Context
) =>
  federationExportService.replayGatewayDeadLetter({
    id,
    operatorId: viewer.id,
    reason,
  })

export default resolver
