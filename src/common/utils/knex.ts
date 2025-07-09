import type { ValueOf } from '#definitions/index.js'
import type { Knex } from 'knex'

import {
  USER_FEATURE_FLAG_TYPE,
  USER_RESTRICTION_TYPE,
} from '#common/enums/index.js'

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

export const excludeRestrictedAuthors = (
  builder: Knex.QueryBuilder,
  table = 'article',
  type: ValueOf<
    typeof USER_RESTRICTION_TYPE
  > = USER_RESTRICTION_TYPE.articleNewest
) => {
  builder.whereNotExists((qb) =>
    qb
      .select(1)
      .from('user_restriction')
      .where('user_restriction.type', type)
      .where('user_restriction.user_id', qb.client.ref(`${table}.author_id`))
  )
}

export const excludeExclusiveCampaignArticles = (
  builder: Knex.QueryBuilder,
  table = 'article'
) => {
  builder.whereNotExists((qb) =>
    qb
      .select(1)
      .from('campaign_article')
      .join('campaign', 'campaign_article.campaign_id', 'campaign.id')
      .where('campaign.exclusive', true)
      .where('campaign_article.article_id', qb.client.ref(`${table}.id`))
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
