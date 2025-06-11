import type { Connections } from '#definitions/index.js'
import type { Knex } from 'knex'

import { TRANSACTION_PURPOSE, TRANSACTION_STATE } from '#common/enums/index.js'

export class BadgeService {
  private knex: Knex
  private knexRO: Knex

  public constructor(connections: Connections) {
    this.knex = connections.knex
    this.knexRO = connections.knexRO
  }

  /**
   * Checks and assigns golden motor badges to eligible users
   * @param threshold Minimum number of donations required for the badge (default: 100)
   * @returns Array of newly assigned badges
   */
  public async checkMotorBadge(threshold = 100) {
    // Find users who should have the golden motor badge but don't have it yet
    const items = await this.knexRO
      .raw(
        `
      SELECT user_name, display_name, t.*, user_badge.*
      FROM (
        SELECT sender_id ::int, COUNT(*) ::int
        FROM transaction
        WHERE purpose=? AND state=?
        GROUP BY 1
      ) t
      LEFT JOIN public.user sender ON sender_id=sender.id
      LEFT JOIN user_badge ON sender_id=user_badge.user_id AND user_badge.type='golden_motor'
      WHERE user_badge.user_id IS NULL AND count >= ?
      ORDER BY count DESC
    `,
        [TRANSACTION_PURPOSE.donation, TRANSACTION_STATE.succeeded, threshold]
      )
      .then((result) => result.rows)

    // Filter and map users who should receive the badge

    const shouldHaveMotorUsers = items
      .filter(
        (item: { sender_id: number; count: number }) =>
          item.sender_id != null && item.count >= threshold
      )
      .map((item: { sender_id: number }) => ({
        user_id: item.sender_id,
        type: 'golden_motor',
      }))

    console.log(
      `Users to receive golden motor badge (threshold: ${threshold}):`,
      shouldHaveMotorUsers
    )

    // Insert new badges if there are eligible users
    if (shouldHaveMotorUsers.length > 0) {
      const result = await this.knex('user_badge')
        .insert(shouldHaveMotorUsers)
        .onConflict(['user_id', 'type'])
        .ignore()
        .returning('*')

      console.log('Inserted new user badges:', result)
      return result
    }

    return []
  }
}
