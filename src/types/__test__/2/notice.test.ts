import type { Connections } from '#definitions/index.js'
import { v4 as uuidv4 } from 'uuid'
import { NODE_TYPES } from '#common/enums/index.js'
import { toGlobalId, fromGlobalId } from '#common/utils/index.js'
import {
  AtomService,
  SystemService,
  CollectionService,
  CampaignService,
} from '#connectors/index.js'

import { testClient, genConnections, closeConnections } from '../utils.js'

let connections: Connections
let atomService: AtomService
let systemService: SystemService
let collectionService: CollectionService
let campaignService: CampaignService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  systemService = new SystemService(connections)
  collectionService = new CollectionService(connections)
  campaignService = new CampaignService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

const USER_ID = toGlobalId({ type: NODE_TYPES.User, id: 1 })
const GET_NOTICES = /* GraphQL */ `
  query ($nodeInput: NodeInput!) {
    node(input: $nodeInput) {
      ... on User {
        notices(input: { first: 100 }) {
          edges {
            node {
              id
              __typename
              createdAt
              unread
              ... on CommentNotice {
                commentNoticeType: type
                target {
                  id
                }
              }
              ... on MomentNotice {
                momentNoticeType: type
                target {
                  id
                }
              }
              ... on ArticleNotice {
                articleNoticeType: type
                target {
                  id
                }
                entities {
                  id
                  __typename
                }
              }
            }
          }
        }
      }
    }
  }
`

test('query notices', async () => {
  // viewer id is 1
  const server = await testClient({ isAuth: true, connections })
  const { data, errors } = await server.executeOperation({
    query: GET_NOTICES,
    variables: {
      nodeInput: { id: USER_ID },
    },
  })

  expect(errors).toBeUndefined()
  const notices = data.node.notices.edges
  expect(notices.length).toBeGreaterThan(0)
  for (const notice of notices) {
    expect(fromGlobalId(notice.node.id).type).toBe(NODE_TYPES.Notice)
    expect(notice.node.__typename).toBeDefined()
    expect(notice.node.createdAt).toBeDefined()
    expect(notice.node.unread).toBeDefined()
    if (notice.node.__typename === 'CommentNotice') {
      expect(notice.node.commentNoticeType).toBeDefined()
      expect(notice.node.target.id).toBeDefined()
    } else if (notice.node.__typename === 'MomentNotice') {
      expect(notice.node.momentNoticeType).toBeDefined()
      expect(notice.node.target.id).toBeDefined()
    } else if (notice.node.__typename === 'ArticleNotice') {
      expect(notice.node.articleNoticeType).toBeDefined()
      expect(notice.node.target.id).toBeDefined()
    }
  }
})

test('query `scheduled_article_published` notice', async () => {
  // create test notice in db
  const noticeDetail = await atomService.create({
    table: 'notice_detail',
    data: {
      noticeType: 'scheduled_article_published',
    },
  })
  const notice = await atomService.create({
    table: 'notice',
    data: {
      noticeDetailId: noticeDetail.id,
      recipientId: '1',
      uuid: uuidv4(),
    },
  })

  const { id: articleEntityTypeID } = await systemService.baseFindEntityTypeId(
    'article'
  )
  const { id: collectionEntityTypeID } =
    await systemService.baseFindEntityTypeId('collection')
  const { id: campaignEntityTypeID } = await systemService.baseFindEntityTypeId(
    'campaign'
  )

  await atomService.create({
    table: 'notice_entity',
    data: {
      noticeId: notice.id,
      entityTypeId: articleEntityTypeID,
      entityId: '1',
      type: 'target',
    },
  })
  await atomService.create({
    table: 'notice_entity',
    data: {
      noticeId: notice.id,
      entityTypeId: articleEntityTypeID,
      entityId: '1',
      type: 'connection',
    },
  })
  const collection = await collectionService.createCollection({
    title: 'test collection',
    authorId: '1',
  })
  await atomService.create({
    table: 'notice_entity',
    data: {
      noticeId: notice.id,
      entityTypeId: collectionEntityTypeID,
      entityId: collection.id,
      type: 'collection',
    },
  })
  const campaign = await campaignService.createWritingChallenge({
    name: 'test campaign',
    creatorId: '1',
  })
  await atomService.create({
    table: 'notice_entity',
    data: {
      noticeId: notice.id,
      entityTypeId: campaignEntityTypeID,
      entityId: campaign.id,
      type: 'campaign',
    },
  })

  const server = await testClient({ isAuth: true, connections })
  const { data, errors } = await server.executeOperation({
    query: GET_NOTICES,
    variables: {
      nodeInput: { id: USER_ID },
    },
  })

  expect(errors).toBeUndefined()
  const notices = data.node.notices.edges
  const latestNotice = notices[0].node
  expect(latestNotice.articleNoticeType).toBe('ScheduledArticlePublished')
  expect(latestNotice.entities.length).toBe(3)
  expect(
    [
      latestNotice.entities[0].__typename,
      latestNotice.entities[1].__typename,
      latestNotice.entities[2].__typename,
    ].sort()
  ).toEqual(['Article', 'WritingChallenge', 'Collection'].sort())
})
