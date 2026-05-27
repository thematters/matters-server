import type { GQLOssResolvers } from '#definitions/index.js'

import {
  connectionFromPromisedArray,
  fromConnectionArgs,
} from '#common/utils/index.js'

/**
 * OSS report listing.
 *
 * Returns a UNION of:
 *   1. `report` table rows — reports submitted via the in-site report form.
 *   2. `community_watch_action` table rows — comment removals performed by
 *      community watch members. Surfaced here so OSS staff can take follow-up
 *      action (e.g. account freeze) from a single triage list.
 *
 * Rows from each source are tagged with a `source` discriminator
 * (`direct` / `community_watch`) which the OSS UI uses to render a badge.
 *
 * Pagination is done at the SQL layer (UNION ALL + ORDER BY + LIMIT/OFFSET)
 * so we never load both tables in full into memory.
 *
 * NOTE: knex is configured with `knexSnakeCaseMappers`, so column names in
 * the SELECT list use snake_case in raw SQL but the rows we hand to the
 * Report resolver come back camelCased automatically.
 */
export const reports: GQLOssResolvers['reports'] = async (
  _,
  { input },
  {
    dataSources: {
      connections: { knex },
    },
  }
) => {
  const { take, skip } = fromConnectionArgs(input)

  // Direct reports: select native columns; tag with source='direct'.
  const directQuery = knex
    .select(
      knex.raw(`'direct' as source`),
      knex.raw(`id::text as id`),
      'reporter_id',
      'article_id',
      'comment_id',
      'moment_id',
      'reason',
      'created_at'
    )
    .from('report')

  // Community-watch derived rows:
  //   - id is synthesised as 'cw:{id}' so it can't collide with real report.id
  //   - reporter_id maps to actor_id (the watcher)
  //   - target is always a comment; article_id/moment_id are null
  //   - reason is namespaced to make it visually distinct in OSS UI
  const communityWatchQuery = knex
    .select(
      knex.raw(`'community_watch' as source`),
      knex.raw(`'cw:' || id::text as id`),
      knex.raw(`actor_id as reporter_id`),
      knex.raw(`null::bigint as article_id`),
      'comment_id',
      knex.raw(`null::bigint as moment_id`),
      knex.raw(
        `case reason
           when 'porn_ad' then 'community_watch_porn_ad'
           when 'spam_ad' then 'community_watch_spam_ad'
         end as reason`
      ),
      'created_at'
    )
    .from('community_watch_action')
    .where('action_state', 'active')

  // Wrap the UNION in a subquery so we can ORDER BY / LIMIT / OFFSET across
  // both halves without affecting either half's selection.
  const unioned = knex
    .select('*')
    .from(directQuery.unionAll(communityWatchQuery).as('reports_union'))

  const [countResult, items] = await Promise.all([
    knex
      .count('* as count')
      .from(directQuery.unionAll(communityWatchQuery).as('reports_union_count'))
      .first(),
    unioned.orderBy('created_at', 'desc').limit(take).offset(skip),
  ])

  const totalCount = parseInt(
    countResult ? (countResult.count as string) : '0',
    10
  )

  return connectionFromPromisedArray(items, input, totalCount)
}
