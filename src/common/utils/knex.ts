import { Knex } from 'knex'

export const excludeSpam = (
  builder: Knex.QueryBuilder,
  spamThreshold: number | null,
  table = 'article'
) => {
  if (spamThreshold) {
    // if (`is_spam` is false) or (`is_spam` is null and (`spam_score` is less than the threshold or `spam_score` is null))
    builder.where((whereBuilder) => {
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
    })
  }
}

export const selectWithTotalCount = (builder: Knex.QueryBuilder) =>
  builder.select(builder.client.raw('count(1) OVER() ::integer AS total_count'))
