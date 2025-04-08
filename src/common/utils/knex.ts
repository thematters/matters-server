import type { Knex } from 'knex'

import { USER_FEATURE_FLAG_TYPE } from '#common/enums/index.js'

/**
 * Exclude spam articles
 */
export const excludeSpam = (
  builder: Knex.QueryBuilder,
  spamThreshold: number | null,
  table = 'article'
) => {
  if (spamThreshold) {
    const knex = builder.client.queryBuilder()
    const whitelistedAuthors = knex
      .select('user_id')
      .from('user_feature_flag')
      .where({ type: USER_FEATURE_FLAG_TYPE.bypassSpamDetection })

    builder.where((wrapperBuilder) => {
      wrapperBuilder
        .whereIn(`${table}.author_id`, whitelistedAuthors)
        .orWhere((qb) => {
          qb.whereNotIn(`${table}.author_id`, whitelistedAuthors).andWhere(
            (whereBuilder) => {
              // if (`is_spam` is false) or (`is_spam` is null and (`spam_score` is less than the threshold or `spam_score` is null))
              whereBuilder
                .andWhere(`${table}.is_spam`, false)
                .orWhere((orWhereBuilder) => {
                  orWhereBuilder
                    .whereNull(`${table}.is_spam`)
                    .andWhere((spamScoreWhereBuilder) => {
                      spamScoreWhereBuilder
                        .where(`${table}.spam_score`, '<', spamThreshold)
                        .orWhereNull(`${table}.spam_score`)
                    })
                })
            }
          )
        })
    })
  }
}

export const excludeRestricted = (
  builder: Knex.QueryBuilder,
  table = 'article'
) => {
  builder.whereNotIn(
    `${table}.author_id`,
    builder.client
      .queryBuilder()
      .select('user_id')
      .from('user_restriction')
      .where('type', 'articleNewest')
  )
}

export const selectWithTotalCount = (builder: Knex.QueryBuilder) =>
  builder.select(builder.client.raw('count(1) OVER() ::integer AS total_count'))

export const selectWithRowNumber = (
  builder: Knex.QueryBuilder,
  orderBy: { column: string; order: 'asc' | 'desc' }
) =>
  builder.select(
    builder.client.raw(
      `row_number() OVER(ORDER BY ?? ${orderBy.order}) ::integer AS row_number`,
      [orderBy.column]
    )
  )
