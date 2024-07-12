import type { NotificationType, Connections, Comment } from 'definitions'

import { MONTH, NOTICE_TYPE, OFFICIAL_NOTICE_EXTEND_TYPE } from 'common/enums'
import { v4 } from 'uuid'
import { NotificationService, UserService, AtomService } from 'connectors'

import { genConnections, closeConnections } from './utils'

let connections: Connections
let userService: UserService
let atomService: AtomService
let notificationService: NotificationService
const recipientId = '1'
const delay = 500

const NOTIFICATION_TYPES: NotificationType[] = [
  ...Object.values(NOTICE_TYPE),
  ...Object.values(OFFICIAL_NOTICE_EXTEND_TYPE),
]

beforeAll(async () => {
  connections = await genConnections()
  userService = new UserService(connections)
  atomService = new AtomService(connections)
  notificationService = new NotificationService(connections, { delay })
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
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

describe('create notice', () => {
  test('article title in messages is not `undefined`', async () => {
    const article = await atomService.findUnique({
      table: 'article',
      where: { id: '1' },
    })

    await notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.article_banned,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
      recipientId: article.authorId,
    })
    await notificationService.trigger({
      event: OFFICIAL_NOTICE_EXTEND_TYPE.article_reported,
      entities: [{ type: 'target', entityTable: 'article', entity: article }],
      recipientId: article.authorId,
    })

    const notices = await notificationService.notice.findByUser({
      userId: article.authorId,
    })

    expect(notices[0].message).not.toContain('undefined')
    expect(notices[1].message).not.toContain('undefined')
  })
  test('blocked actor notice will be skipped', async () => {
    const actorId = '2'
    const recipientId = '1'
    await userService.block(recipientId, actorId)

    const noticeCount = await notificationService.notice.countNotice({
      userId: recipientId,
    })

    await notificationService.trigger({
      event: NOTICE_TYPE.user_new_follower,
      actorId,
      recipientId,
    })

    expect(
      await notificationService.notice.countNotice({ userId: recipientId })
    ).toBe(noticeCount)
  })
})

describe('find notice', () => {
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

  test('article_new_comment notice bundle is disabled', async () => {
    const articleVersion = await atomService.articleVersionIdLoader.load('2')
    const article = await atomService.articleIdLoader.load(
      articleVersion.articleId
    )

    const comment1 = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test',
        authorId: '3',
        targetId: article.id,
        targetTypeId: '4',
        articleVersionId: articleVersion.id,
      },
    })
    const comment2 = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test',
        authorId: '3',
        targetId: article.id,
        targetTypeId: '4',
        articleVersionId: articleVersion.id,
      },
    })

    const noticeCount = await notificationService.notice.countNotice({
      userId: article.authorId,
    })

    const job1 = await notificationService.trigger({
      event: NOTICE_TYPE.article_new_comment,
      actorId: comment2.authorId,
      recipientId: article.authorId,
      entities: [
        { type: 'target', entityTable: 'article', entity: article },
        { type: 'comment', entityTable: 'comment', entity: comment1 },
      ],
    })

    const job2 = await notificationService.trigger({
      event: NOTICE_TYPE.article_new_comment,
      actorId: comment2.authorId,
      recipientId: article.authorId,
      entities: [
        { type: 'target', entityTable: 'article', entity: article },
        { type: 'comment', entityTable: 'comment', entity: comment2 },
      ],
    })

    await job1.finished()
    await job2.finished()

    expect(
      await notificationService.notice.countNotice({ userId: article.authorId })
    ).toBe(noticeCount + 2)
  })

  test('comment_liked notice bundle is disabled', async () => {
    const comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test',
        authorId: '4',
        targetId: '1',
        targetTypeId: '4',
        articleVersionId: '1',
      },
    })

    const noticeCount = await notificationService.notice.countNotice({
      userId: comment.authorId,
    })

    const job1 = await notificationService.trigger({
      event: NOTICE_TYPE.article_comment_liked,
      actorId: '1',
      recipientId: comment.authorId,
      entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
    })

    const job2 = await notificationService.trigger({
      event: NOTICE_TYPE.article_comment_liked,
      actorId: '2',
      recipientId: comment.authorId,
      entities: [{ type: 'target', entityTable: 'comment', entity: comment }],
    })

    await job1.finished()
    await job2.finished()

    expect(
      await notificationService.notice.countNotice({ userId: comment.authorId })
    ).toBe(noticeCount + 2)
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
    const notices = await notificationService.notice.findByUser({
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

describe('cancel notices', () => {
  let comment: Comment
  beforeAll(async () => {
    comment = await atomService.create({
      table: 'comment',
      data: {
        uuid: v4(),
        content: 'test',
        authorId: '5',
        targetId: '1',
        targetTypeId: '4',
        articleVersionId: '1',
      },
    })
  })
  test('cancel delayed notices', async () => {
    const params = {
      event: NOTICE_TYPE.article_comment_liked as const,
      actorId: '1',
      recipientId: comment.authorId,
      entities: [
        { type: 'target', entityTable: 'comment', entity: comment },
      ] as [{ type: 'target'; entityTable: 'comment'; entity: Comment }],
    }
    const noticeCount = await notificationService.notice.countNotice({
      userId: comment.authorId,
    })

    // will not throw error if the job is not found
    await notificationService.cancel(params)

    const job = await notificationService.trigger(params)

    await notificationService.cancel(params)

    //  A job that is not found in any list will return the state stuck.
    //  see https://github.com/OptimalBits/bull/blob/4cea99e4fd5dcaac0c53b8dc80a18a0fe98c99d1/test/test_job.js#L277
    expect(await job.getState()).toBe('stuck')

    expect(
      await notificationService.notice.countNotice({ userId: comment.authorId })
    ).toBe(noticeCount)
  })
  test('cancel completed notices will not remove jobs from queue', async () => {
    const params = {
      event: NOTICE_TYPE.article_comment_liked as const,
      actorId: '2',
      recipientId: comment.authorId,
      entities: [
        { type: 'target', entityTable: 'comment', entity: comment },
      ] as [{ type: 'target'; entityTable: 'comment'; entity: Comment }],
    }
    const job = await notificationService.trigger(params)
    await job.finished()

    await notificationService.cancel(params)
    expect(await job.getState()).toBe('completed')
  })
})
