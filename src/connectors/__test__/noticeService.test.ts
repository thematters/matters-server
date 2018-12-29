import { NotificationService } from '../notificationService'

const notificationService = new NotificationService()
const { noticeService } = notificationService
const recipientId = '1'
const getBundleableUserNewFollowerNoticeId = () =>
  noticeService.getBundleableNoticeId({
    type: 'user_new_follower',
    actorIds: ['4'],
    recipientId
  })

describe('bundle notices', async () => {
  test('bundleable', async () => {
    // bundleable
    const userNewFollowerNoticeId = await getBundleableUserNewFollowerNoticeId()
    expect(userNewFollowerNoticeId).not.toBeUndefined()
  })

  test('unbundleable', async () => {
    // notice without actors and entities
    const userDisabledNoticeId = await noticeService.getBundleableNoticeId({
      type: 'user_disabled',
      recipientId,
      data: { reason: 'violation' }
    })
    expect(userDisabledNoticeId).toBeUndefined()

    // notice without actors
    const articleNewDownstreamNoticeId = await noticeService.getBundleableNoticeId(
      {
        type: 'article_new_downstream',
        recipientId,
        entities: [
          { type: 'target', entityTable: 'article', entity: { id: '1' } },
          { type: 'downstream', entityTable: 'article', entity: { id: '3' } }
        ]
      }
    )
    expect(articleNewDownstreamNoticeId).toBeUndefined()
  })

  test('getBundleActorIds', async () => {
    const noticeId = await getBundleableUserNewFollowerNoticeId()
    const donothingActorIds = await noticeService.getBundleActorIds({
      noticeId,
      actorIds: ['2']
    })
    expect(donothingActorIds.length).toBe(0)

    const bundleActorIds = await noticeService.getBundleActorIds({
      noticeId,
      actorIds: ['2', '4']
    })
    expect(bundleActorIds.length).toBe(1)
    expect(bundleActorIds[0]).toBe('4')
  })

  test('bundle successs', async () => {
    const noticeId = await getBundleableUserNewFollowerNoticeId()
    const noticeActors = await noticeService.findActorsByNoticeId(noticeId)
    expect(noticeActors.length).toBe(2)
    await noticeService.addNoticeActors({ noticeId, actorIds: ['4'] })
    await new Promise(resolve => setTimeout(resolve, 100))
    const notice2Actors = await noticeService.findActorsByNoticeId(noticeId)
    expect(notice2Actors.length).toBe(3)
  })

  test('bundle failed if the notice actor is duplicate', async () => {
    const noticeId = await getBundleableUserNewFollowerNoticeId()
    try {
      await noticeService.addNoticeActors({ noticeId, actorIds: ['2'] })
    } catch (e) {
      expect(() => {
        throw e
      }).toThrowError('unique constraint')
    }
  })

  test('mark notice as read then it becomes unbundleable', async () => {
    const noticeId = await getBundleableUserNewFollowerNoticeId()
    await noticeService.baseUpdateById(noticeId, { unread: false }, 'notice')
    const unbundleableNotice = await getBundleableUserNewFollowerNoticeId()
    expect(unbundleableNotice).toBeUndefined()
  })
})

describe('update notices', async () => {
  test('markAllNoticesAsRead', async () => {
    const notices = await noticeService.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(notices.length).not.toBe(0)

    await noticeService.markAllNoticesAsRead(recipientId)

    const readNotices = await noticeService.knex
      .select()
      .where({ recipientId, unread: true })
      .from('notice')
    expect(readNotices.length).toBe(0)
  })
})
