import type {
  Context,
  GQLQueryResolvers,
} from '#definitions/index.js'

const resolver: GQLQueryResolvers['communityWatchAction'] = (
  _: unknown,
  { input: { uuid } }: { input: { uuid: string } },
  { dataSources: { commentService } }: Context
) => commentService.findCommunityWatchActionByUUID(uuid)

export default resolver
