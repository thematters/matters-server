import type { NotificationType, Connections } from 'definitions'

import { MONTH, NOTIFICATION_TYPES } from 'common/enums'
import { NotificationService, UserService } from 'connectors'

import { genConnections } from './utils'

let connections: Connections
let userService: UserService
let notificationService: NotificationService
const recipientId = '1'

beforeAll(async () => {
  connections = await genConnections()
  userService = new UserService(connections)
  notificationService = new NotificationService(connections)
})

/**
 * Notification Service
 */
describe('user notify setting', () => {
  const defaultNoifySetting: Record<NotificationType, boolean> = {
    // user
    user_new_follower: true,

    // article
    article_published: true,
    article_new_appreciation: true,
    article_new_subscriber: false,
    article_mentioned_you: true,
    revised_article_published: true,
    revised_article_not_published: true,
    circle_new_article: true,

    // article-article
    article_new_collected: false,

    // comment
    comment_pinned: false,
    comment_mentioned_you: true,
    article_new_comment: true,
    circle_new_broadcast: true,

    // comment-comment
    comment_new_reply: true,

    // transaction
    payment_received_donation: true,

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
  }

  test('user receives notifications', async () => {
    await Promise.all(
      NOTIFICATION_TYPES.map(async (type) => {
        const notifySetting = await userService.findNotifySetting(recipientId)
        const enable = await notificationService.notice.checkUserNotifySetting({
          event: type,
          setting: notifySetting,
        })
        expect(enable).toBe(defaultNoifySetting[type])
      })
    )
  })

  test('user disable "user_new_follower"', async () => {
    const notifySetting = await userService.findNotifySetting(recipientId)
    await userService.updateNotifySetting(notifySetting.id, {
      userNewFollower: false,
    })
    const newNotifySetting = await userService.findNotifySetting(recipientId)
    await Promise.all(
      NOTIFICATION_TYPES.map(async (type) => {
        const enable = await notificationService.notice.checkUserNotifySetting({
          event: type,
          setting: newNotifySetting,
        })
        expect(enable).toBe(
          type === 'user_new_follower' ? false : defaultNoifySetting[type]
        )
      })
    )
  })
})

/**
 * Notice Service
 */
const getBundleableUserNewFollowerNotice = async () => {
  const bundleables = await notificationService.notice.findBundleables({
    type: 'user_new_follower',
    actorId: '4',
    recipientId,
  })
  return bundleables[0]
}
describe('find notice', () => {
  test('find one notice', async () => {
    const notice = await notificationService.notice.dataloader.load('1')
    expect(notice.id).toBe('1')
  })
  test('find many notices', async () => {
    const notices = await notificationService.notice.findByUser({
      userId: recipientId,
    })
    expect(notices.length).toBeGreaterThan(5)
  })
})

describe('bundle notices', () => {
  test('bundleable', async () => {
    // bundleable
    const userNewFollowerNotice = await getBundleableUserNewFollowerNotice()
    expect(userNewFollowerNotice.id).not.toBeUndefined()
  })

  test('unbundleable', async () => {
    // notice without actors
    // const bundleables = await notificationService.notice.findBundleables({
    //   type: 'article_new_downstream',
    //   recipientId,
    //   entities: [
    //     { type: 'target', entityTable: 'article', entity: { id: '1' } },
    //     { type: 'downstream', entityTable: 'article', entity: { id: '3' } },
    //   ],
    // })
    // expect(bundleables.length).toBe(0)
  })

  test('bundle successs', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    const noticeActors = await notificationService.notice.findActors(notice.id)
    expect(noticeActors.length).toBe(2)
    await notificationService.notice.addNoticeActor({
      noticeId: notice.id,
      actorId: '4',
    })
    await new Promise((resolve) => setTimeout(resolve, 1000))
    const notice2Actors = await notificationService.notice.findActors(notice.id)
    expect(notice2Actors.length).toBe(3)
  })

  test('bundle failed if the notice actor is duplicate', async () => {
    const notice = await getBundleableUserNewFollowerNotice()
    if (!notice) {
      throw new Error('expect notice is bundleable')
    }
    try {
      await notificationService.notice.addNoticeActor({
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
    await notificationService.notice.baseUpdate(
      notice.id,
      { unread: false },
      'notice'
    )
    const unbundleableNotice = await getBundleableUserNewFollowerNotice()
    expect(unbundleableNotice).toBeUndefined()
  })
})

describe('update notices', () => {
  test('markAllNoticesAsRead', async () => {
    const notices = await notificationService.notice.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(notices.length).not.toBe(0)

    await notificationService.notice.markAllNoticesAsRead(recipientId)

    const readNotices = await notificationService.notice.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(readNotices.length).toBe(0)
  })
})

describe('query notices with onlyRecent flag', () => {
  beforeAll(async () => {
    const notices = await notificationService.notice.findByUser({
      userId: recipientId,
    })
    const oldNoticeId = notices[0].id
    const recentNoticeId = notices[1].id
    await notificationService.notice.knex
      .update({ createdAt: '2019-01-01', updatedAt: '2019-01-01' })
      .where({ id: oldNoticeId })
      .from('notice')
    const fiveMonthAgo = new Date(Date.now() - MONTH * 5)
    await notificationService.notice.knex
      .update({ createdAt: fiveMonthAgo, updatedAt: fiveMonthAgo })
      .where({ id: recentNoticeId })
      .from('notice')
  })
  test('countNotice', async () => {
    const count1 = await notificationService.notice.countNotice({
      userId: recipientId,
    })
    const count2 = await notificationService.notice.countNotice({
      userId: recipientId,
      onlyRecent: true,
    })
    expect(count1 - count2).toBe(1)
  })
  test('findByUser', async () => {
    const notices1 = await notificationService.notice.findByUser({
      userId: recipientId,
    })
    const notices2 = await notificationService.notice.findByUser({
      userId: recipientId,
      onlyRecent: true,
    })
    expect(notices1.length - notices2.length).toBe(1)
  })
})
