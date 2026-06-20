import type {
  Context,
  ModerationCaseOutcome,
  ModerationCaseStatus,
  ModerationNoticeState,
} from '#definitions/index.js'

type UpdateModerationCaseInput = {
  id: string
  status?: ModerationCaseStatus | null
  outcome?: ModerationCaseOutcome | null
  noticeState?: ModerationNoticeState | null
  publicReason?: string | null
  internalNote?: string | null
}

const resolver = async (
  _: unknown,
  { input }: { input: UpdateModerationCaseInput },
  { viewer, dataSources: { systemService } }: Context
) =>
  systemService.updateModerationCase({
    ...input,
    actorId: viewer.id,
  })

export default resolver
