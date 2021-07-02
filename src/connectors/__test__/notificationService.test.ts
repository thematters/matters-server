import { NOTIFICATION_TYPES } from 'common/enums'
import { knex, NotificationService, UserService } from 'connectors'
import { sharedQueueOpts } from 'connectors/queue/utils'
import { NotificationType } from 'definitions'

afterAll(async () => {
  await knex.destroy()
  const redisClient = sharedQueueOpts.createClient()
  // TODO: still have asynchronous operations running
  redisClient.disconnect()
})

const notificationService = new NotificationService()
const userService = new UserService()
const recipientId = '1'

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
    article_new_collected: true,

    // comment
    comment_pinned: true,
    comment_mentioned_you: true,
    circle_broadcast_mentioned_you: true,
    circle_discussion_mentioned_you: true,
    article_new_comment: true,
    subscribed_article_new_comment: false,
    circle_new_broadcast: true,

    // comment-comment
    comment_new_reply: true,
    circle_broadcast_new_reply: true,
    circle_discussion_new_reply: true,

    // article-tag
    article_tag_has_been_added: true,
    article_tag_has_been_removed: true,
    article_tag_has_been_unselected: true,

    // tag
    tag_adoption: true,
    tag_leave: true,
    tag_add_editor: true,
    tag_leave_editor: true,

    // transaction
    payment_received_donation: true,
    payment_payout: true,

    // circle
    circle_new_follower: true,
    circle_new_subscriber: true,
    circle_new_unsubscriber: true,
    circle_invitation: true,

    // misc
    official_announcement: true,
    user_activated: true,
    user_banned: true,
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
