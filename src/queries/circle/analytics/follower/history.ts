import Knex from 'knex'

import { CIRCLE_ACTION } from 'common/enums'
import { CircleFollowerAnalyticsToHistoryResolver } from 'definitions'

const resolver: CircleFollowerAnalyticsToHistoryResolver = async (
  { id },
  _,
  { dataSources: { atomService }, knex }
) => {
  const take = 4

  const selectPastMonth = (month: number) =>
    knex.raw(
      `select date_trunc('month', current_date - interval '${month}' month) as date`
    )
  const result = await knex
    .with('last_4_months', (builder) => {
      builder
        .select()
        .union([
          selectPastMonth(3),
          selectPastMonth(2),
          selectPastMonth(1),
          selectPastMonth(0),
        ])
        .orderBy('date', 'asc')
    })

    .select('date')
    .select(knex.raw(`sum(value) OVER (ORDER BY date asc) AS value`))
    .from((builder: Knex.QueryBuilder) => {
      builder
        .select(knex.raw(`coalesce(date, group_month) as date`))
        .select(knex.raw(`coalesce(group_count, 0) as value`))
        .from('last_4_months')
        .fullOuterJoin(
          knex
            .select(knex.raw(`date_trunc('month', created_at) as group_month`))
            .count('id', { as: 'group_count' })
            .from('action_circle')
            .where({ targetId: id, action: CIRCLE_ACTION.follow })
            .groupBy('group_month')
            .as('history'),
          'history.group_month',
          'last_4_months.date'
        )
        .as('joined_history')
    })
    .as('cumsum_history')

  return result.slice(take * -1)
}

export default resolver
