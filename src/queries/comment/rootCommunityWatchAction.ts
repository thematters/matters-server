import type {
  Context,
  GQLQueryResolvers,
} from '#definitions/index.js'

const resolver: GQLQueryResolvers['communityWatchAction'] = (
  _: unknown,
  { input: { uuid } }: { input: { uuid: string } },
  { dataSources: { connections: { knex } } }: Context
) =>
  knex('community_watch_action')
    .select()
    .where({ uuid })
    .first()

export default resolver
