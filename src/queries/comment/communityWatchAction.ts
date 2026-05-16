import type {
  Comment,
  Context,
  GQLCommentResolvers,
} from '#definitions/index.js'

const resolver: GQLCommentResolvers['communityWatchAction'] = (
  { id }: Comment,
  _: unknown,
  { dataSources: { commentService } }: Context
) => commentService.findActiveCommunityWatchAction(id)

export default resolver
