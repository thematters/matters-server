import type { Connections } from '#definitions/index.js'

import { v4 } from 'uuid'

import {
  NODE_TYPES,
  USER_STATE,
  IMAGE_ASSET_TYPE,
  MOMENT_STATE,
} from '#common/enums/index.js'
import { toGlobalId } from '#common/utils/index.js'
import { MomentService, SystemService } from '#connectors/index.js'

import { genConnections, closeConnections, testClient } from '../utils.js'

let connections: Connections
let momentService: MomentService
let systemService: SystemService

beforeAll(async () => {
  connections = await genConnections()
  momentService = new MomentService(connections)
  systemService = new SystemService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('query moment', () => {
  const GET_MOMENT = /* GraphQL */ `
    query ($input: MomentInput!) {
      moment(input: $input) {
        id
        shortHash
        author {
          id
        }
        content
        assets {
          id
          path
        }
        tags {
          id
          content
        }
        articles {
          id
        }
        state
        commentCount
        comments(input: { first: 10 }) {
          edges {
            node {
              id
            }
          }
        }
        commentedFollowees {
          id
        }
        likeCount
        liked
        createdAt
      }
    }
  `
  test('visitors can query', async () => {
    const moment = await momentService.create(
      { content: 'test' },
      { id: '1', state: USER_STATE.active, userName: 'test' }
    )
    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: GET_MOMENT,
      variables: { input: { shortHash: moment.shortHash } },
    })
    expect(errors).toBeUndefined()
    expect(data.moment.shortHash).toBe(moment.shortHash)
    const momentId = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
    expect(data.moment.id).toBe(momentId)
    expect(data.moment.commentedFollowees).toEqual([])
    expect(data.moment.liked).toBeFalsy()
  })
  test('logged-in users can query', async () => {
    const moment = await momentService.create(
      { content: 'test' },
      { id: '1', state: USER_STATE.active, userName: 'test' }
    )
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: GET_MOMENT,
      variables: { input: { shortHash: moment.shortHash } },
    })
    expect(errors).toBeUndefined()
  })
})

describe('create moment', () => {
  const PUT_MOMENT = /* GraphQL */ `
    mutation ($input: PutMomentInput!) {
      putMoment(input: $input) {
        id
        assets {
          id
          path
        }
      }
    }
  `
  test('success', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const content = 'test'
    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: viewer.id,
        type: IMAGE_ASSET_TYPE.moment,
        path: 'test.jpg',
      },
      '1',
      '1'
    )
    const { errors, data } = await server.executeOperation({
      query: PUT_MOMENT,
      variables: { input: { content, assets: [asset.uuid] } },
    })
    expect(errors).toBeUndefined()
    expect(data.putMoment.assets[0].path).toBe(systemService.genAssetUrl(asset))
  })

  const PUT_MOMENT_WITH_TAGS = /* GraphQL */ `
    mutation ($input: PutMomentInput!) {
      putMoment(input: $input) {
        id
        assets {
          id
          path
        }
        tags {
          id
          content
        }
        articles {
          id
        }
      }
    }
  `

  test('success with tags and article', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const content = 'test with tags and article'
    const asset = await systemService.findAssetOrCreateByPath(
      {
        uuid: v4(),
        authorId: viewer.id,
        type: IMAGE_ASSET_TYPE.moment,
        path: 'test2.jpg',
      },
      '1',
      '1'
    )
    const articleId = toGlobalId({ type: NODE_TYPES.Article, id: '1' })
    const tagContent = 'MomentTagTest1'
    const { errors, data } = await server.executeOperation({
      query: PUT_MOMENT_WITH_TAGS,
      variables: {
        input: {
          content,
          assets: [asset.uuid],
          tags: [tagContent],
          articles: [articleId],
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.putMoment.assets[0].path).toBe(systemService.genAssetUrl(asset))
    expect(data.putMoment.tags).toHaveLength(1)
    expect(data.putMoment.tags[0].content).toBe(tagContent)
    expect(data.putMoment.articles).toHaveLength(1)
    expect(data.putMoment.articles[0].id).toBe(articleId)
  })
})

describe('delete moment', () => {
  const DELETE_MOMENT = /* GraphQL */ `
    mutation ($input: DeleteMomentInput!) {
      deleteMoment(input: $input) {
        state
      }
    }
  `
  test('success', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const moment = await momentService.create({ content: 'test' }, viewer)
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const id = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
    const { errors, data } = await server.executeOperation({
      query: DELETE_MOMENT,
      variables: { input: { id } },
    })
    expect(errors).toBeUndefined()
    expect(data.deleteMoment.state).toBe(MOMENT_STATE.archived)
  })
})

describe('set moment tags', () => {
  const PUT_MOMENT_WITH_TAGS = /* GraphQL */ `
    mutation ($input: PutMomentInput!) {
      putMoment(input: $input) {
        id
        shortHash
        tags {
          id
          content
        }
      }
    }
  `
  const SET_MOMENT_TAGS = /* GraphQL */ `
    mutation ($input: SetMomentTagsInput!) {
      setMomentTags(input: $input) {
        id
        tags {
          id
          content
        }
      }
    }
  `

  const createMomentWithTags = async (
    server: any,
    content: string,
    tags: string[]
  ) => {
    const { data } = await server.executeOperation({
      query: PUT_MOMENT_WITH_TAGS,
      variables: { input: { content, tags } },
    })
    return data.putMoment
  }

  test('author overwrites tags', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const moment = await createMomentWithTags(server, 'overwrite', [
      'SetTagA',
      'SetTagB',
    ])
    const { errors, data } = await server.executeOperation({
      query: SET_MOMENT_TAGS,
      variables: { input: { id: moment.id, tags: ['SetTagB', 'SetTagC'] } },
    })
    expect(errors).toBeUndefined()
    const contents = data.setMomentTags.tags.map((t: any) => t.content).sort()
    expect(contents).toEqual(['SetTagB', 'SetTagC'])
  })

  test('empty array clears all tags', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const moment = await createMomentWithTags(server, 'clear', ['SetTagClear'])
    const { errors, data } = await server.executeOperation({
      query: SET_MOMENT_TAGS,
      variables: { input: { id: moment.id, tags: [] } },
    })
    expect(errors).toBeUndefined()
    expect(data.setMomentTags.tags).toHaveLength(0)
  })

  test('rejects more than three tags', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const server = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const moment = await createMomentWithTags(server, 'too many', ['Keep'])
    const { errors } = await server.executeOperation({
      query: SET_MOMENT_TAGS,
      variables: {
        input: { id: moment.id, tags: ['t1', 't2', 't3', 't4'] },
      },
    })
    expect(errors).toBeDefined()
  })

  test('non-author is rejected', async () => {
    const author = { id: '5', state: USER_STATE.active, userName: 'author5' }
    const moment = await momentService.create(
      { content: 'by author 5' },
      author
    )
    const id = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })
    const server = await testClient({ isAuth: true, connections })
    const { errors } = await server.executeOperation({
      query: SET_MOMENT_TAGS,
      variables: { input: { id, tags: ['x'] } },
    })
    expect(errors).toBeDefined()
  })
})

describe('query tag channel moments', () => {
  const PUT_MOMENT_WITH_TAGS = /* GraphQL */ `
    mutation ($input: PutMomentInput!) {
      putMoment(input: $input) {
        id
        shortHash
        tags {
          id
          content
        }
      }
    }
  `
  const PUT_TAG_CHANNEL = /* GraphQL */ `
    mutation ($input: PutTagChannelInput!) {
      putTagChannel(input: $input) {
        id
      }
    }
  `
  const GET_CHANNELS = /* GraphQL */ `
    query ($input: ConnectionArgs!) {
      channels(input: { oss: true }) {
        ... on TagChannel {
          navbarTitle(input: { language: en })
          moments(input: $input) {
            totalCount
            edges {
              node {
                id
                shortHash
              }
            }
          }
        }
      }
    }
  `
  test('tag channel returns moments attached with its tag', async () => {
    const viewer = { id: '1', state: USER_STATE.active, userName: 'test' }
    const userServer = await testClient({
      connections,
      context: { viewer },
      isAuth: true,
    })
    const { data: putData } = await userServer.executeOperation({
      query: PUT_MOMENT_WITH_TAGS,
      variables: {
        input: { content: 'tag channel moment', tags: ['TagChannelFeed'] },
      },
    })
    const tagId = putData.putMoment.tags[0].id
    const shortHash = putData.putMoment.shortHash

    // enable the tag as a sidebar channel with a unique navbar title
    const navTitle = 'TagChannelFeedNav'
    const adminServer = await testClient({
      connections,
      isAuth: true,
      isAdmin: true,
    })
    const { errors: putErrors } = await adminServer.executeOperation({
      query: PUT_TAG_CHANNEL,
      variables: {
        input: {
          id: tagId,
          enabled: true,
          navbarTitle: [{ language: 'en', text: navTitle }],
        },
      },
    })
    expect(putErrors).toBeUndefined()

    const { errors, data } = await adminServer.executeOperation({
      query: GET_CHANNELS,
      variables: { input: { first: 10 } },
    })
    expect(errors).toBeUndefined()
    const channel = data.channels.find((c: any) => c?.navbarTitle === navTitle)
    expect(channel).toBeDefined()
    expect(channel.moments.totalCount).toBeGreaterThanOrEqual(1)
    const hashes = channel.moments.edges.map((e: any) => e.node.shortHash)
    expect(hashes).toContain(shortHash)
  })
})

describe('like/unlike moment', () => {
  const LIKE_MOMENT = /* GraphQL */ `
    mutation ($input: LikeMomentInput!) {
      likeMoment(input: $input) {
        id
        liked
      }
    }
  `
  const UNLIKE_MOMENT = /* GraphQL */ `
    mutation ($input: UnlikeMomentInput!) {
      unlikeMoment(input: $input) {
        id
        liked
      }
    }
  `
  test('success', async () => {
    const author = { id: '5', state: USER_STATE.active, userName: 'test' }
    const moment = await momentService.create({ content: 'test' }, author)
    const server = await testClient({ isAuth: true, connections })
    const id = toGlobalId({ type: NODE_TYPES.Moment, id: moment.id })

    const { errors: errorsLike, data: dataLike } =
      await server.executeOperation({
        query: LIKE_MOMENT,
        variables: { input: { id } },
      })
    expect(errorsLike).toBeUndefined()
    expect(dataLike.likeMoment.liked).toBeTruthy()

    const { errors: errorsUnlike, data: dataUnlike } =
      await server.executeOperation({
        query: UNLIKE_MOMENT,
        variables: { input: { id } },
      })
    expect(errorsUnlike).toBeUndefined()
    expect(dataUnlike.unlikeMoment.liked).toBeFalsy()
  })
})
