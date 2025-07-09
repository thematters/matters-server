import type { Connections, NotificationType } from '#definitions/index.js'

import {
  MONTH,
  NOTICE_TYPE,
  OFFICIAL_NOTICE_EXTEND_TYPE,
} from '#common/enums/index.js'
import { NotificationService } from '#connectors/notification/notificationService.js'
import { mergeDataWith } from '#connectors/notification/utils.js'

import { genConnections, closeConnections } from './utils.js'

let connections: Connections
let notificationService: NotificationService
const recipientId = '1'

const NOTIFICATION_TYPES = [
  ...Object.values(NOTICE_TYPE),
  ...Object.values(OFFICIAL_NOTICE_EXTEND_TYPE),
]

beforeAll(async () => {
  connections = await genConnections()
  notificationService = new NotificationService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

// utils
test('mergeDataWith', () => {
  expect(mergeDataWith({ a: [1, 2] }, { a: [2, 3] })).toEqual({ a: [1, 2, 3] })
})

// service
describe('user notify setting', () => {
  const defaultNoifySetting: Record<NotificationType, boolean> = {
    // user
    user_new_follower: true,

    // article
    article_published: true,
    scheduled_article_published: true,
    article_new_appreciation: true,
    article_new_subscriber: false,
    article_mentioned_you: true,
    revised_article_published: true,
    revised_article_not_published: true,
    circle_new_article: true,

    // collection
    collection_liked: true,

    // moment
    moment_liked: true,
    moment_mentioned_you: true,

    // article-article
    article_new_collected: false,

    // comment
    article_comment_liked: true,
    moment_comment_liked: true,
    article_comment_mentioned_you: true,
    moment_comment_mentioned_you: true,
    article_new_comment: true,
    moment_new_comment: true,
    circle_new_broadcast: true,

    // comment-comment
    comment_new_reply: true,

    // campaign-article
    campaign_article_featured: true,

    // transaction
    payment_received_donation: true,
    withdrew_locked_tokens: true,

    // circle
    circle_invitation: true,
    circle_new_subscriber: true,
    circle_new_unsubscriber: true,
    circle_new_follower: true,

    circle_new_broadcast_comments: true, // only a placeholder
    circle_broadcast_mentioned_you: true,
    circle_member_new_broadcast_reply: true,
    in_circle_new_broadcast_reply: false,

    circle_new_discussion_comments: true, // only a placeholder
    circle_discussion_mentioned_you: true,
    circle_member_new_discussion: true,
    circle_member_new_discussion_reply: true,
    in_circle_new_discussion: true,
    in_circle_new_discussion_reply: false,

    // misc
    official_announcement: true,
    user_banned: true,
    user_banned_payment: true,
    user_frozen: true,
    user_unbanned: true,
    comment_banned: true,
    article_banned: true,
    comment_reported: true,
    article_reported: true,
    write_challenge_applied: true,
    write_challenge_applied_late_bird: true,
    badge_grand_slam_awarded: true,
    write_challenge_announcement: true,
    topic_channel_feedback_accepted: true,
  }

  test('user receives notifications', async () => {
    await Promise.all(
      NOTIFICATION_TYPES.map(async (type) => {
        // @ts-ignore
        const notifySetting = await notificationService.findNotifySetting(
          recipientId
        )
        const enable = await notificationService.checkUserNotifySetting({
          event: type,
          setting: notifySetting,
        })
        expect(enable).toBe(defaultNoifySetting[type])
      })
    )
  })
})

/**
 * Notice Service
 */
const getBundleableUserNewFollowerNotice = async () => {
  // @ts-ignore
  const bundleables = await notificationService.findBundleables({
    type: NOTICE_TYPE.user_new_follower,
    actorId: '4',
    recipientId,
  })
  return bundleables[0]
}

describe('bundle notices', () => {
  test('bundleable', async () => {
    // bundleable
    const userNewFollowerNotice = await getBundleableUserNewFollowerNotice()
    expect(userNewFollowerNotice.id).not.toBeUndefined()
  })

  test('bundle successs', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    const noticeActors = await notificationService.findActors(notice.id)
    expect(noticeActors.length).toBe(2)
    // @ts-ignore
    await notificationService.addNoticeActor({
      noticeId: notice.id,
      actorId: '4',
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const notice2Actors = await notificationService.findActors(notice.id)
    expect(notice2Actors.length).toBe(3)
  })

  test('bundle failed if the notice actor is duplicate', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    try {
      // @ts-ignore
      await notificationService.addNoticeActor({
        noticeId: notice.id,
        actorId: '2',
      })
    } catch (e) {
      expect(() => {
        throw e
      }).toThrowError('unique constraint')
    }
  })

  test('mark notice as read then it becomes unbundleable', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    await connections
      .knex('notice')
      .where({ id: notice.id })
      .update({ unread: false })
    const unbundleableNotice = await getBundleableUserNewFollowerNotice()
    expect(unbundleableNotice).toBeUndefined()
  })
})

describe('trigger notifications', () => {
  test('trigger `write_challenge_applied` notice', async () => {
    const [{ id: campaignId }] = await connections
      .knex('campaign')
      .insert({
        type: 'writing_challenge',
        creatorId: '1',
        name: 'test',
        description: 'test',
        state: 'active',
        shortHash: 'test-notice-hash',
      })
      .returning('id')
    // no error
    const [notice] = await notificationService.process({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_applied,
      recipientId: '1',
      entities: [
        {
          type: 'target',
          entityTable: 'campaign',
          entity: { id: campaignId },
        },
      ],
      data: { link: 'https://example.com' },
    })
    expect(notice.id).toBeDefined()
  })
  test('trigger `badge_grand_slam_awarded` notice', async () => {
    // no errors
    const [notice] = await notificationService.process({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.badge_grand_slam_awarded,
      recipientId: '1',
    })
    expect(notice.id).toBeDefined()
  })
  test('trigger `collection_liked` notice', async () => {
    // no errors
    const [notice] = await notificationService.process({
      event: NOTICE_TYPE.collection_liked,
      actorId: '1',
      recipientId: '1',
      tag: 'test',
      entities: [
        {
          type: 'target',
          entityTable: 'collection',
          entity: { id: '1' },
        },
      ],
    })
    // actorId is same as recipientId, notice is not created
    expect(notice).toBeUndefined()
  })
  test('trigger `write_challenge_announcement` notice', async () => {
    const [{ id: campaignId }] = await connections
      .knex('campaign')
      .insert({
        type: 'writing_challenge',
        creatorId: '1',
        name: 'test',
        description: 'test',
        state: 'active',
        shortHash: 'test-notice-hash-1',
      })
      .returning('id')
    await connections.knex('campaign_user').insert({
      campaignId,
      userId: '1',
      state: 'succeeded',
    })
    // no errors
    const [notice] = await notificationService.process({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.write_challenge_announcement,
      data: {
        link: 'https://example.com',
        campaignId,
        messages: {
          zh_hant: 'zh-Hant message',
          zh_hans: 'zh-Hans message',
          en: 'en message',
        },
      },
    })
    expect(notice.id).toBeDefined()
  })
})

describe('find notice', () => {
  test('find many notices', async () => {
    const notices = await notificationService.findByUser({
      userId: recipientId,
    })
    expect(notices.length).toBeGreaterThan(5)
  })
})

describe('update notices', () => {
  test('markAllNoticesAsRead', async () => {
    const notices = await connections.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(notices.length).not.toBe(0)

    await notificationService.markAllNoticesAsRead(recipientId)

    const readNotices = await connections.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(readNotices.length).toBe(0)
  })
})

describe('query notices with onlyRecent flag', () => {
  beforeAll(async () => {
    const notices = await notificationService.findByUser({
      userId: recipientId,
    })
    const oldNoticeId = notices[0].id
    const recentNoticeId = notices[1].id
    await connections.knex
      .update({ createdAt: '2019-01-01', updatedAt: '2019-01-01' })
      .where({ id: oldNoticeId })
      .from('notice')
    const fiveMonthAgo = new Date(Date.now() - MONTH * 5)
    await connections.knex
      .update({ createdAt: fiveMonthAgo, updatedAt: fiveMonthAgo })
      .where({ id: recentNoticeId })
      .from('notice')
  })
  test('countNotice', async () => {
    const count1 = await notificationService.countNotice({
      userId: recipientId,
    })
    const count2 = await notificationService.countNotice({
      userId: recipientId,
      onlyRecent: true,
    })
    expect(count1 - count2).toBe(1)
  })
  test('findByUser', async () => {
    const notices1 = await notificationService.findByUser({
      userId: recipientId,
    })
    const notices2 = await notificationService.findByUser({
      userId: recipientId,
      onlyRecent: true,
    })
    expect(notices1.length - notices2.length).toBe(1)
  })
})
