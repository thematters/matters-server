import type {
  Comment,
  Context,
  GQLCommentResolvers,
} from '#definitions/index.js'

const resolver: GQLCommentResolvers['communityWatchAction'] = (
  { id }: Comment,
  _: unknown,
  {
    dataSources: {
      connections: { knex },
    },
  }: Context
) =>
  knex('community_watch_action')
    .select('uuid', 'reason', 'createdAt')
    .where({ commentId: id, actionState: 'active' })
    .first()

export default resolver
