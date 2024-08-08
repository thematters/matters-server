import { Knex } from 'knex'

export const excludeSpam = (
  builder: Knex.QueryBuilder,
  spamThreshold: number | null,
  table = 'article'
) => {
  if (spamThreshold) {
    builder.where((whereBuilder) => {
      if (spamThreshold) {
        whereBuilder
          .andWhere(`${table}.is_spam`, false)
          .orWhere((spamWhereBuilder) => {
            spamWhereBuilder
              .where(`${table}.spam_score`, '<', spamThreshold)
              .orWhereNull(`${table}.spam_score`)
          })
      }
    })
  }
}
