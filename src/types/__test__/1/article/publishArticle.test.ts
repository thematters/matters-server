import type { Connections } from '#definitions/index.js'

import { jest } from '@jest/globals'

import {
  PUBLISH_STATE,
  CAMPAIGN_STATE,
  NODE_TYPES,
} from '#common/enums/index.js'
import { ActionLimitExceededError } from '#common/errors.js'
import { toGlobalId } from '#common/utils/index.js'
import {
  AtomService,
  CampaignService,
  CollectionService,
} from '#connectors/index.js'
import {
  publishArticle,
  putDraft,
  testClient,
  genConnections,
  closeConnections,
} from '../../utils.js'

const PUBLISH_ARTICLE = /* GraphQL */ `
  mutation ($input: PublishArticleInput!) {
    publishArticle(input: $input) {
      id
      publishState
      title
      content
      iscnPublish
      article {
        id
        iscnId
        content
      }
      collections(input: { first: 5 }) {
        totalCount
        edges {
          node {
            id
          }
        }
      }
      createdAt
    }
  }
`
let connections: Connections
let atomService: AtomService
let collectionService: CollectionService
beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  collectionService = new CollectionService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})
describe('publish article', () => {
  test('user w/o username can not publish', async () => {
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
    }
    const { id } = await putDraft({ draft }, connections)
    const server = await testClient({ noUserName: true, connections })

    const { errors } = await server.executeOperation({
      query: PUBLISH_ARTICLE,
      variables: { input: { id } },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })
  test('create a draft & publish it', async () => {
    jest.setTimeout(10000)
    const draft = {
      title: Math.random().toString(),
      content: Math.random().toString(),
    }
    const { id } = await putDraft({ draft }, connections)
    const { publishState, article } = await publishArticle({ id }, connections)
    expect(publishState).toBe(PUBLISH_STATE.pending)
    expect(article).toBeNull()
  })

  test('create a draft & publish with iscn', async () => {
    jest.setTimeout(10000)
    const draft = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          iscnPublish: true,
        },
      },
      connections
    )
    expect(draft.id).not.toBeNull()
    expect(draft.iscnPublish).toBe(true)

    const { publishState } = await publishArticle({ id: draft.id }, connections)
    expect(publishState).toBe(PUBLISH_STATE.pending)
  })

  test('publish published draft', async () => {
    const draftId = '4'
    await atomService.update({
      table: 'draft',
      where: { id: draftId },
      data: { articleId: '4', archived: true },
    })
    const publishedDraftId = toGlobalId({ type: NODE_TYPES.Draft, id: draftId })
    const { publishState, article } = await publishArticle(
      {
        id: publishedDraftId,
      },
      connections
    )
    expect(publishState).toBe(PUBLISH_STATE.published)
    expect(article.content).not.toBeNull()
    expect(article.indentFirstLine).toBe(false)
  })

  test('cannot publish article with both circle and campaign', async () => {
    jest.setTimeout(10000)

    const campaignData = {
      name: 'test',
      description: 'test',
      link: 'https://test.com',
      applicationPeriod: [
        new Date('2010-01-01 11:30'),
        new Date('2010-01-01 15:00'),
      ] as const,
      writingPeriod: [
        new Date('2010-01-02 11:30'),
        new Date('2010-01-02 15:00'),
      ] as const,
      creatorId: '2',
    }
    const campaignService = new CampaignService(connections)
    const campaign = await campaignService.createWritingChallenge({
      ...campaignData,
      state: CAMPAIGN_STATE.active,
    })
    const stages = await campaignService.updateStages(campaign.id, [
      { name: 'stage1' },
    ])
    const userId = '1'
    const circle = await atomService.create({
      table: 'circle',
      data: {
        name: 'circle-test',
        owner: userId,
        displayName: 'circle-test',
        providerProductId: 'circle-test-product-id',
      },
    })
    const draft = await atomService.create({
      table: 'draft',
      data: {
        title: Math.random().toString(),
        content: Math.random().toString(),
        authorId: userId,
        circleId: circle.id,
        campaigns: JSON.stringify([
          { campaign: campaign.id, stage: stages[0].id },
        ]),
      },
    })
    const server = await testClient({ isAuth: true, userId, connections })

    const { errors } = await server.executeOperation({
      query: PUBLISH_ARTICLE,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Draft, id: draft.id }) },
      },
    })

    expect(errors?.[0].message).toContain(
      'Article cannot be added to campaign or circle at the same time'
    )
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })
})

describe('publishArticle', () => {
  test('should validate collection capacity before publishing', async () => {
    // Create test data
    const authorId = '1'

    const collection = await collectionService.createCollection({
      title: 'Test Collection',
      authorId,
    })

    const collectionId = toGlobalId({
      type: NODE_TYPES.Collection,
      id: collection.id,
    })

    // Create draft with collection
    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId,
        title: 'Test Draft',
        content: 'Test content',
        collections: [collection.id],
      },
    })

    const user = await atomService.findUnique({
      table: 'user',
      where: { id: authorId },
    })
    const server = await testClient({
      isAuth: true,
      context: { viewer: user },
      connections,
    })

    // Test successful publish
    const { data, errors } = await server.executeOperation({
      query: PUBLISH_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Draft, id: draft.id }),
          iscnPublish: false,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data.publishArticle.collections.totalCount).toBe(1)
    expect(data.publishArticle.collections.edges[0].node.id).toBe(collectionId)
  })

  test('should fail when collection capacity is exceeded', async () => {
    const authorId = '1'
    const user = await atomService.findUnique({
      table: 'user',
      where: { id: authorId },
    })

    const collection = await collectionService.createCollection({
      title: 'Full Collection',
      authorId,
    })

    // Mock collection service to simulate capacity exceeded
    jest
      .spyOn(collectionService, 'validateCollectionCapacity')
      .mockImplementationOnce(() => {
        throw new ActionLimitExceededError('Collection capacity exceeded')
      })

    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId,
        title: 'Test Draft',
        content: 'Test content',
        collections: [collection.id],
      },
    })

    const server = await testClient({
      isAuth: true,
      context: { viewer: user },
      connections,
      dataSources: {
        collectionService,
      },
    })

    const { errors } = await server.executeOperation({
      query: PUBLISH_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Draft, id: draft.id }),
          iscnPublish: false,
        },
      },
    })

    expect(errors[0].extensions.code).toBe('ACTION_LIMIT_EXCEEDED')
  })

  test('should handle non-existent collections gracefully', async () => {
    const authorId = '1'
    const user = await atomService.findUnique({
      table: 'user',
      where: { id: authorId },
    })

    const draft = await atomService.create({
      table: 'draft',
      data: {
        authorId: user.id,
        title: 'Test Draft',
        content: 'Test content',
        collections: ['999999'], // Non-existent collection ID
      },
    })

    const server = await testClient({
      isAuth: true,
      context: { viewer: user },
      connections,
    })

    const { errors } = await server.executeOperation({
      query: PUBLISH_ARTICLE,
      variables: {
        input: {
          id: toGlobalId({ type: NODE_TYPES.Draft, id: draft.id }),
          iscnPublish: false,
        },
      },
    })

    console.log(errors)

    expect(errors[0].extensions.code).toBe('ENTITY_NOT_FOUND')
  })
})
