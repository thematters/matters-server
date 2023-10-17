import type { GQLCircleSubscriberAnalyticsResolvers } from 'definitions'

import { PAYMENT_PROVIDER } from 'common/enums'

const resolver: GQLCircleSubscriberAnalyticsResolvers['subscriberHistory'] =
  async (
    { id },
    _,
    {
      dataSources: {
        connections: { knex },
      },
    }
  ) => {
    const selectPastMonth = (month: number) =>
      knex.raw(
        `select date_trunc('month', current_date - interval '${month}' month) as date`
      )
    const [last4Months, subItems] = await Promise.all([
      knex
        .select()
        .union([
          selectPastMonth(3),
          selectPastMonth(2),
          selectPastMonth(1),
          selectPastMonth(0),
        ])
        .orderBy('date', 'asc'),
      knex
        .count('csi.id')
        .select(knex.raw(`date_trunc('month', csi.created_at) as started_at`))
        .select(
          knex.raw(
            `(CASE csi.archived WHEN false THEN null ELSE date_trunc('month', csi.canceled_at) END) as ended_at`
          )
        )
        .from('circle_subscription_item as csi')
        .leftJoin('circle_price', 'csi.price_id', 'circle_price.id')
        .where({
          'circle_price.circle_id': id,
          'csi.provider': PAYMENT_PROVIDER.stripe,
        })
        .groupBy('started_at', 'ended_at'),
    ])

    return last4Months.map(({ date }) => {
      const value = subItems.reduce((a, c) => {
        if (date >= c.startedAt && (!c.endedAt || date <= c.endedAt)) {
          return a + parseInt(c.count, 10) || 0
        }

        return a
      }, 0)

      return { date, value }
    })
  }

export default resolver
