import type { GQLCircleSubscriberAnalyticsResolvers } from 'definitions'

const resolver: GQLCircleSubscriberAnalyticsResolvers['inviteeHistory'] =
  async ({ id }, _, { dataSources: { atomService }, knex }) => {
    const selectPastMonth = (month: number) =>
      knex.raw(
        `select date_trunc('month', current_date - interval '${month}' month) as date`
      )
    const [last4Months, invitations] = await Promise.all([
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
        .count('id')
        .select(knex.raw(`date_trunc('month', accepted_at) as started_at`))
        .select(
          knex.raw(
            `date_trunc('month', accepted_at + duration_in_days * interval '1 day') as ended_at`
          )
        )
        .from('circle_invitation')
        .where({
          circle_id: id,
        })
        .whereNotNull('accepted_at')
        .groupBy('started_at', 'ended_at'),
    ])

    return last4Months.map(({ date }) => {
      const value = invitations.reduce((a, c) => {
        if (date >= c.startedAt && date <= c.endedAt) {
          return a + parseInt(c.count, 10) || 0
        }

        return a
      }, 0)

      return { date, value }
    })
  }

export default resolver
