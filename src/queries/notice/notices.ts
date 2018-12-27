import { Resolver, BatchParams, Context } from 'definitions'

const resolver: Resolver = async (
  { id }: { id: string },
  { input: { offset, limit } }: BatchParams,
  { dataSources: { notificationService } }: Context
) =>
  await notificationService.noticeService.findNoticesByUserId(id, offset, limit)

export default resolver
