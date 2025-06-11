import type { Connections } from '#definitions/index.js'
import { BadgeService, AtomService, PaymentService } from '#connectors/index.js'
import { TRANSACTION_STATE } from '#common/enums/index.js'

import { genConnections, closeConnections, createDonationTx } from './utils.js'

describe('BadgeService', () => {
  let connections: Connections
  let badgeService: BadgeService
  let atomService: AtomService
  let paymentService: PaymentService

  beforeAll(async () => {
    connections = await genConnections()
    badgeService = new BadgeService(connections)
    atomService = new AtomService(connections)
    paymentService = new PaymentService(connections)
  }, 30000)

  afterAll(async () => {
    await closeConnections(connections)
  })

  beforeEach(async () => {
    // Clean up previous test data
    await atomService.deleteMany({ table: 'user_badge' })
    await atomService.deleteMany({ table: 'transaction' })
  })

  describe('checkMotorBadge', () => {
    test('assigns golden motor badge to eligible users', async () => {
      const userId = '1' // Using seed user from db/seeds/01_users.js
      const recipientId = '2' // Another seed user as recipient

      // Create 10 successful transactions using utility function
      for (let i = 0; i < 10; i++) {
        await createDonationTx(
          {
            senderId: userId,
            recipientId,
          },
          paymentService
        )
      }

      // Run the badge check
      const result = await badgeService.checkMotorBadge(10)

      // Verify badge assignment
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        userId: userId,
        type: 'golden_motor',
      })

      // Verify badge exists in database
      const badge = await atomService.findFirst({
        table: 'user_badge',
        where: { userId, type: 'golden_motor' },
      })
      expect(badge).toBeDefined()
    })

    test('does not assign badge when donations are below threshold', async () => {
      const userId = '2' // Using different seed user
      const recipientId = '3'

      // Create 5 successful transactions (below threshold)
      for (let i = 0; i < 5; i++) {
        await createDonationTx(
          {
            senderId: userId,
            recipientId,
          },
          paymentService
        )
      }

      // Run the badge check
      const result = await badgeService.checkMotorBadge(10)

      // Verify no badge was assigned
      expect(result).toHaveLength(0)

      // Verify no badge exists in database
      const badge = await atomService.findFirst({
        table: 'user_badge',
        where: { userId, type: 'golden_motor' },
      })
      expect(badge).toBeUndefined()
    })

    test('ignores failed transactions for badge eligibility', async () => {
      const userId = '3'
      const recipientId = '4'

      // Create 9 successful transactions
      for (let i = 0; i < 9; i++) {
        await createDonationTx(
          {
            senderId: userId,
            recipientId,
            state: TRANSACTION_STATE.succeeded,
          },
          paymentService
        )
      }

      // Create 2 failed transactions
      for (let i = 0; i < 2; i++) {
        await createDonationTx(
          {
            senderId: userId,
            recipientId,
            state: TRANSACTION_STATE.failed,
          },
          paymentService
        )
      }

      // Run the badge check
      const result = await badgeService.checkMotorBadge(10)

      // Verify no badge was assigned (only 9 successful donations)
      expect(result).toHaveLength(0)
    })

    test('does not duplicate badges for already awarded users', async () => {
      const userId = '4'
      const recipientId = '1'

      // Create existing badge
      await atomService.create({
        table: 'user_badge',
        data: {
          userId,
          type: 'golden_motor',
        },
      })

      // Create 10 qualifying transactions
      for (let i = 0; i < 10; i++) {
        await createDonationTx(
          {
            senderId: userId,
            recipientId,
          },
          paymentService
        )
      }

      // Run the badge check
      const result = await badgeService.checkMotorBadge(10)

      // Verify no new badge was assigned
      expect(result).toHaveLength(0)

      // Verify only one badge exists
      const badges = await atomService.findMany({
        table: 'user_badge',
        where: { userId, type: 'golden_motor' },
      })
      expect(badges).toHaveLength(1)
    })
  })
})
