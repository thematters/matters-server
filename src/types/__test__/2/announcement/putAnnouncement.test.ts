import type { Connections } from '#definitions/index.js'
import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { genConnections, closeConnections, testClient } from '../../utils.js'
import { AtomService, ChannelService } from '#connectors/index.js'

let connections: Connections
let atomService: AtomService
let channelService: ChannelService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  channelService = new ChannelService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const PUT_ANNOUNCEMENT = /* GraphQL */ `
  mutation PutAnnouncement($input: PutAnnouncementInput!) {
    putAnnouncement(input: $input) {
      id
      title
      titleEn: title(input: { language: en })
      content
      contentEn: content(input: { language: en })
      link
      linkEn: link(input: { language: en })
      cover
      type
      visible
      order
      createdAt
      updatedAt
      expiredAt
      channels {
        channel {
          id
        }
        order
        visible
      }
    }
  }
`

describe('create or update announcements', () => {
  test('create announcement success', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          title: [
            { language: 'zh_hant', text: '測試標題' },
            { language: 'en', text: 'Test Title' },
          ],
          content: [
            { language: 'zh_hant', text: '測試內容' },
            { language: 'en', text: 'Test Content' },
          ],
          link: [
            { language: 'zh_hant', text: 'https://example.com/zh_hant' },
            { language: 'en', text: 'https://example.com/en' },
          ],
          type: 'community',
          visible: true,
          order: 1,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putAnnouncement).toBeDefined()
    expect(data?.putAnnouncement.title).toBe('測試標題')
    expect(data?.putAnnouncement.titleEn).toBe('Test Title')
    expect(data?.putAnnouncement.content).toBe('測試內容')
    expect(data?.putAnnouncement.contentEn).toBe('Test Content')
    expect(data?.putAnnouncement.link).toBe('https://example.com/zh_hant')
    expect(data?.putAnnouncement.linkEn).toBe('https://example.com/en')
    expect(data?.putAnnouncement.cover).toBe('')
    expect(data?.putAnnouncement.type).toBe('community')
    expect(data?.putAnnouncement.visible).toBe(true)
    expect(data?.putAnnouncement.order).toBe(1)
    expect(data?.putAnnouncement.channels).toHaveLength(0)
  })

  test('create announcement with cover success', async () => {
    const admin = await atomService.findFirst({
      table: 'user',
      where: {
        role: 'admin',
      },
    })

    const server = await testClient({
      connections,
      isAuth: true,
      context: { viewer: admin },
    })
    // Create a test asset first
    const asset = await atomService.create({
      table: 'asset',
      data: {
        type: 'announcementCover',
        authorId: admin.id,
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        path: 'test/path.jpg',
      },
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          title: [{ language: 'zh_hant', text: '測試標題' }],
          cover: asset.uuid,
          type: 'community',
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putAnnouncement).toBeDefined()
    expect(data?.putAnnouncement.title).toBe('測試標題')
    expect(data?.putAnnouncement.cover).toBeDefined()
    expect(data?.putAnnouncement.type).toBe('community')
  })

  test('create announcement without type fails', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          title: [{ language: 'zh_hant', text: '測試標題' }],
        },
      },
    })

    expect(errors).toBeDefined()
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('update announcement success', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Create an announcement first
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: '原始標題',
        type: 'community',
      },
    })

    const announcementGlobalId = toGlobalId({
      type: NODE_TYPES.Announcement,
      id: announcement.id,
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          id: announcementGlobalId,
          title: [{ language: 'zh_hant', text: '更新標題' }],
          type: 'product',
          visible: true,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putAnnouncement).toBeDefined()
    expect(data?.putAnnouncement.id).toBe(announcementGlobalId)
    expect(data?.putAnnouncement.title).toBe('更新標題')
    expect(data?.putAnnouncement.type).toBe('product')
    expect(data?.putAnnouncement.visible).toBe(true)
  })

  test('update non-existent announcement fails', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const nonExistentId = toGlobalId({
      type: NODE_TYPES.Announcement,
      id: '999999',
    })

    const { errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          id: nonExistentId,
          title: [{ language: 'zh_hant', text: '測試標題' }],
          type: 'community',
        },
      },
    })

    expect(errors).toBeDefined()
    expect(errors?.[0].extensions.code).toBe('ENTITY_NOT_FOUND')
  })

  test('create announcement with invalid cover fails', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          title: [{ language: 'zh_hant', text: '測試標題' }],
          cover: 'invalid-uuid',
          type: 'community',
        },
      },
    })

    expect(errors).toBeDefined()
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('create announcement with channels', async () => {
    // Create a test channel
    const channel = await channelService.createTopicChannel({
      name: 'Test Channel',
      providerId: 'providerId',
      enabled: true,
    })

    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          title: [{ language: 'en', text: 'With Channel' }],
          type: 'community',
          channels: [{ channel: channel.id, visible: true, order: 1 }],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putAnnouncement.channels).toHaveLength(1)
    expect(data?.putAnnouncement.channels[0].channel.id).toBe(
      toGlobalId({
        type: NODE_TYPES.TopicChannel,
        id: channel.id,
      })
    )
    expect(data?.putAnnouncement.channels[0].visible).toBe(true)
    expect(data?.putAnnouncement.channels[0].order).toBe(1)
  })

  test('update announcement channels', async () => {
    // Create two channels
    const channel1 = await channelService.createTopicChannel({
      name: 'Channel 1',
      providerId: 'providerId1',
      enabled: true,
    })
    const channel2 = await channelService.createTopicChannel({
      name: 'Channel 2',
      providerId: 'providerId2',
      enabled: true,
    })

    // Create an announcement with channel1
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: 'Announcement with Channel',
        type: 'community',
      },
    })

    await atomService.create({
      table: 'channel_announcement',
      data: {
        announcementId: announcement.id,
        channelId: channel1.id,
        visible: true,
        order: 1,
      },
    })

    const announcementGlobalId = toGlobalId({
      type: NODE_TYPES.Announcement,
      id: announcement.id,
    })

    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // create channel_announcement2 and mark channel_announcement1 as invisible
    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          id: announcementGlobalId,
          type: 'community',
          channels: [{ channel: channel2.id, visible: false, order: 2 }],
        },
      },
    })

    expect(errors).toBeUndefined()
    const channels = data?.putAnnouncement.channels
    expect(channels).toHaveLength(2)
    expect(channels.map((channel: any) => channel.visible)).toEqual([
      false,
      false,
    ])
    expect(channels.map((channel: any) => channel.order).sort()).toEqual(
      [1, 2].sort()
    )
  })

  test('remove all channels from announcement', async () => {
    // Create a channel and announcement
    const channel = await channelService.createTopicChannel({
      name: 'Channel to Remove',
      providerId: 'providerId-removechannels',
      enabled: true,
    })
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: 'Announcement to Remove Channel',
        type: 'community',
      },
    })
    await atomService.create({
      table: 'channel_announcement',
      data: {
        announcementId: announcement.id,
        channelId: channel.id,
        visible: true,
        order: 1,
      },
    })

    const announcementGlobalId = toGlobalId({
      type: NODE_TYPES.Announcement,
      id: announcement.id,
    })

    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    // Update with empty channels
    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          id: announcementGlobalId,
          type: 'community',
          channels: [],
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putAnnouncement.channels).toHaveLength(1)
    expect(data?.putAnnouncement.channels[0].channel.id).toBe(
      toGlobalId({
        type: NODE_TYPES.TopicChannel,
        id: channel.id,
      })
    )
    expect(data?.putAnnouncement.channels[0].visible).toBe(false)
    expect(data?.putAnnouncement.channels[0].order).toBe(1)
  })

  test('translations are updated after announcement creation', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: PUT_ANNOUNCEMENT,
      variables: {
        input: {
          title: [
            { language: 'zh_hant', text: '新標題' },
            { language: 'en', text: 'New Title' },
          ],
          content: [
            { language: 'zh_hant', text: '新內容' },
            { language: 'en', text: 'New Content' },
          ],
          link: [
            { language: 'zh_hant', text: 'https://example.com/zh_hant_new' },
            { language: 'en', text: 'https://example.com/en_new' },
          ],
          type: 'community',
          visible: true,
          order: 2,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putAnnouncement.title).toBe('新標題')
    expect(data?.putAnnouncement.titleEn).toBe('New Title')
    expect(data?.putAnnouncement.content).toBe('新內容')
    expect(data?.putAnnouncement.contentEn).toBe('New Content')
    expect(data?.putAnnouncement.link).toBe('https://example.com/zh_hant_new')
    expect(data?.putAnnouncement.linkEn).toBe('https://example.com/en_new')
  })
})
