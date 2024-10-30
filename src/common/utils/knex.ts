import { Knex } from 'knex'

export const excludeSpam = (
  builder: Knex.QueryBuilder,
  spamThreshold: number | null,
  table = 'article'
) => {
  if (spamThreshold) {
    // if (`is_spam` is false)
    // or (`is_spam_by_admin` is false)
    // or (`is_spam` is null and (`spam_score` is less than the threshold or `spam_score` is null))
    builder.where((whereBuilder) => {
      whereBuilder
        .where(`${table}.is_spam`, false)
        .orWhere(`${table}.is_spam_by_admin`, false)
        .orWhere((orWhereBuilder) => {
          orWhereBuilder
            .whereNull(`${table}.is_spam`)
            .andWhere((spamScoreWhereBuilder) => {
              spamScoreWhereBuilder
                .where(`${table}.spam_score`, '<', spamThreshold)
                .orWhereNull(`${table}.spam_score`)
            })
        })
    })
  }
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
