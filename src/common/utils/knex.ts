import { Knex } from 'knex'

export const excludeSpam = (
  builder: Knex.QueryBuilder,
  spamThreshold: number | null,
  table = 'article'
) => {
  if (spamThreshold) {
    // if (`is_spam` is false) or (`spam_score` is less than the threshold or `spam_score` is null)
    builder.where((whereBuilder) => {
      whereBuilder
        .andWhere(`${table}.is_spam`, false)
        .orWhere((spamScoreWhereBuilder) => {
          spamScoreWhereBuilder
            .where(`${table}.spam_score`, '<', spamThreshold)
            .orWhereNull(`${table}.spam_score`)
        })
    })
  }
}
