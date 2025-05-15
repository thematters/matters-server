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

const GET_ANNOUNCEMENTS = /* GraphQL */ `
  query GetAnnouncements($input: AnnouncementsInput!) {
    official {
      announcements(input: $input) {
        id
        title
        content
        link
        cover
        type
        visible
        order
        createdAt
        updatedAt
        expiredAt
      }
    }
  }
`

describe('announcements resolver', () => {
  beforeEach(async () => {
    await atomService.deleteMany({
      table: 'channel_announcement',
    })
    await atomService.deleteMany({
      table: 'announcement',
    })
  })

  test('get announcements by id', async () => {
    // Create a test announcement
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: 'Test Announcement',
        content: 'Test Content',
        type: 'community',
        visible: true,
      },
    })

    const announcementGlobalId = toGlobalId({
      type: NODE_TYPES.Announcement,
      id: announcement.id,
    })

    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { data, errors } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {
          id: announcementGlobalId,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.official.announcements).toHaveLength(1)
    expect(data?.official.announcements[0].id).toBe(announcementGlobalId)
    expect(data?.official.announcements[0].title).toBe('Test Announcement')
    expect(data?.official.announcements[0].content).toBe('Test Content')
    expect(data?.official.announcements[0].type).toBe('community')
    expect(data?.official.announcements[0].visible).toBe(true)
  })

  test('get announcements by channel', async () => {
    // Create a test channel
    const channel = await channelService.createTopicChannel({
      name: 'Test Channel',
      providerId: 'providerId-channelId',
      enabled: true,
    })

    // Create a test announcement
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: 'Channel Announcement',
        content: 'Channel Content',
        type: 'community',
        visible: true,
      },
    })

    // Link announcement to channel
    await atomService.create({
      table: 'channel_announcement',
      data: {
        announcementId: announcement.id,
        channelId: channel.id,
        visible: true,
        order: 1,
      },
    })

    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { data, errors } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {
          channel: {
            id: toGlobalId({
              type: NODE_TYPES.TopicChannel,
              id: channel.id,
            }),
          },
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.official.announcements).toHaveLength(1)
    expect(data?.official.announcements[0].title).toBe('Channel Announcement')
    expect(data?.official.announcements[0].content).toBe('Channel Content')
  })

  test('get announcements by channel shortHash', async () => {
    const server = await testClient({
      connections,
      isAuth: true,
    })
    // Create a test channel with specific shortHash
    const channel = await channelService.createTopicChannel({
      name: 'ShortHash Channel',
      providerId: 'providerId-shortHash',
      enabled: true,
    })

    // Create a test announcement
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: 'ShortHash Announcement',
        content: 'ShortHash Content',
        type: 'community',
        visible: true,
      },
    })

    const { data: data1, errors: errors1 } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {
          channel: {
            shortHash: channel.shortHash,
          },
        },
      },
    })

    expect(errors1).toBeUndefined()
    expect(data1?.official.announcements).toHaveLength(0)

    // Link announcement to channel
    await atomService.create({
      table: 'channel_announcement',
      data: {
        announcementId: announcement.id,
        channelId: channel.id,
        visible: true,
        order: 1,
      },
    })

    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {
          channel: {
            shortHash: channel.shortHash,
          },
        },
      },
    })

    expect(errors2).toBeUndefined()
    expect(data2?.official.announcements).toHaveLength(1)
    expect(data2?.official.announcements[0].title).toBe(
      'ShortHash Announcement'
    )
    expect(data2?.official.announcements[0].content).toBe('ShortHash Content')
  })

  test('get announcements with cover', async () => {
    // Create a test asset
    const asset = await atomService.create({
      table: 'asset',
      data: {
        type: 'announcementCover',
        uuid: '123e4567-e89b-12d3-a456-426614174000',
        path: 'test/path.jpg',
      },
    })

    // Create a test announcement with cover
    const announcement = await atomService.create({
      table: 'announcement',
      data: {
        title: 'Cover Announcement',
        content: 'Cover Content',
        type: 'community',
        visible: true,
        cover: asset.id,
      },
    })

    const announcementGlobalId = toGlobalId({
      type: NODE_TYPES.Announcement,
      id: announcement.id,
    })

    const server = await testClient({
      connections,
      isAuth: true,
    })

    const { data, errors } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {
          id: announcementGlobalId,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.official.announcements).toHaveLength(1)
    expect(data?.official.announcements[0].title).toBe('Cover Announcement')
    expect(data?.official.announcements[0].cover).toBeDefined()
  })

  test('non-admin users can only see visible announcements', async () => {
    // Create visible and invisible announcements
    await atomService.create({
      table: 'announcement',
      data: {
        title: 'Visible Announcement',
        type: 'community',
        visible: true,
      },
    })

    await atomService.create({
      table: 'announcement',
      data: {
        title: 'Invisible Announcement',
        type: 'community',
        visible: false,
      },
    })

    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: false,
    })

    const { data, errors } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {},
      },
    })

    expect(errors).toBeUndefined()
    const announcements = data?.official.announcements
    expect(announcements).toBeDefined()
    expect(
      announcements.some((a: any) => a.title === 'Visible Announcement')
    ).toBe(true)
    expect(
      announcements.some((a: any) => a.title === 'Invisible Announcement')
    ).toBe(false)
  })

  test('get all announcements for admin users', async () => {
    // Create visible and invisible announcements
    await atomService.create({
      table: 'announcement',
      data: {
        title: 'Visible Announcement',
        type: 'community',
        visible: true,
      },
    })

    await atomService.create({
      table: 'announcement',
      data: {
        title: 'Invisible Announcement',
        type: 'community',
        visible: false,
      },
    })

    const server = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })

    const { data, errors } = await server.executeOperation({
      query: GET_ANNOUNCEMENTS,
      variables: {
        input: {},
      },
    })

    expect(errors).toBeUndefined()
    const announcements = data?.official.announcements
    expect(announcements).toBeDefined()
    expect(
      announcements.some((a: any) => a.title === 'Visible Announcement')
    ).toBe(true)
    expect(
      announcements.some((a: any) => a.title === 'Invisible Announcement')
    ).toBe(true)
  })
})
