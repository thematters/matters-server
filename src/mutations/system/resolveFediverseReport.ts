import type { Context, GlobalId } from '#definitions/index.js'

const resolver = async (
  _: unknown,
  {
    input: { id, resolution },
  }: { input: { id: GlobalId; resolution: string } },
  { viewer, dataSources: { federationExportService } }: Context
) =>
  federationExportService.resolveGatewayAbuseCase({
    id,
    operatorId: viewer.id!,
    resolution: resolution.trim(),
  })

export default resolver
