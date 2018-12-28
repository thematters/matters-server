import { NotificationService } from '../notificationService'
import { knex } from 'connectors/db'

afterAll(knex.destroy)

const notificationService = new NotificationService()
const { noticeService } = notificationService
const recipientId = '1'
const getBundleableUserNewFollowerNotice = () =>
  noticeService.getBundleableNotice({
    type: 'user_new_follower',
    actorIds: ['4'],
    recipientId
  })

test('bundleable', async () => {
  // bundleable
  const userNewFollowerNotice = await getBundleableUserNewFollowerNotice()
  expect(userNewFollowerNotice).not.toBeUndefined()

  // unbundleable
  const userDisabledNotice = await noticeService.getBundleableNotice({
    type: 'user_disabled',
    recipientId,
    data: { reason: 'violation' }
  })
  expect(userDisabledNotice).toBeUndefined()

  // unbundleable
  const articleNewDownstreamNotice = await noticeService.getBundleableNotice({
    type: 'article_new_downstream',
    recipientId,
    entities: [
      { type: 'target', entityTable: 'article', entity: { id: '1' } },
      { type: 'downstream', entityTable: 'article', entity: { id: '3' } }
    ]
  })
  expect(articleNewDownstreamNotice).toBeUndefined()
})

test('bundle successs', async () => {
  const notice = await getBundleableUserNewFollowerNotice()
  const noticeActors = await noticeService.findActorsByNoticeId(notice.id)
  expect(noticeActors.length).toBe(2)
  await noticeService.addNoticeActors(notice.id, ['4'])
  const notice2Actors = await noticeService.findActorsByNoticeId(notice.id)
  expect(notice2Actors.length).toBe(3)
})

test('bundle failed if the notice actor is duplicate', async () => {
  const notice = await getBundleableUserNewFollowerNotice()
  try {
    await noticeService.addNoticeActors(notice.id, ['2'])
  } catch (e) {
    expect(() => {
      throw e
    }).toThrowError('unique constraint')
  }
})

test('becomes unbundleable', async () => {
  // mark 'user_new_follower' as read then it becomes unbundleable
  const notice = await getBundleableUserNewFollowerNotice()
  await noticeService.baseUpdateById(notice.id, { unread: false }, 'notice')
  const unbundleableNotice = await getBundleableUserNewFollowerNotice()
  expect(unbundleableNotice).toBeUndefined()
})

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
