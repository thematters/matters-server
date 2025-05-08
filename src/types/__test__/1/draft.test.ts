import type { Connections } from '#definitions/index.js'

import { AtomService, CampaignService } from '#connectors/index.js'
import {
  ARTICLE_LICENSE_TYPE,
  NODE_TYPES,
  CAMPAIGN_STATE,
  MAX_TAGS_PER_ARTICLE_LIMIT,
  MAX_ARTICLES_PER_CONNECTION_LIMIT,
} from '#common/enums/index.js'
import { toGlobalId, fromGlobalId } from '#common/utils/index.js'

import {
  testClient,
  putDraft,
  genConnections,
  closeConnections,
} from '../utils.js'

let connections: Connections
let atomService: AtomService
beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

describe('query draft', () => {
  const GET_DRAFT_ARTICLE = /* GraphQL */ `
    query ($input: NodeInput!) {
      node(input: $input) {
        ... on Draft {
          id
          article {
            title
          }
        }
      }
    }
  `
  test('get draft article', async () => {
    const id = toGlobalId({ type: NODE_TYPES.Draft, id: 4 })
    const author = await atomService.userIdLoader.load('1')
    const server = await testClient({
      connections,
      context: { viewer: author },
    })
    const { errors, data } = await server.executeOperation({
      query: GET_DRAFT_ARTICLE,
      variables: { input: { id } },
    })
    expect(errors).toBeUndefined()
    expect(data.node.article.title).toBeDefined()
  })
})

describe('put draft', () => {
  test('edit draft summary', async () => {
    const { id, errors } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )
    expect(errors).toBeUndefined()

    const summary = 'my customized summary'
    const result = await putDraft({ draft: { id, summary } }, connections)
    expect(result.summary).toBe(summary)
    expect(result.summaryCustomized).toBe(true)

    // reset summary
    const resetResult1 = await putDraft(
      {
        draft: { id, summary: null as any },
      },
      connections
    )
    expect(resetResult1.summary.length).toBeGreaterThan(0)
    expect(resetResult1.summaryCustomized).toBe(false)

    const resetResult2 = await putDraft(
      { draft: { id, summary: '' } },
      connections
    )
    expect(resetResult2.summaryCustomized).toBe(false)
  })

  test('edit draft tags', async () => {
    const tags = [
      'abc',
      '123',
      'tags too long | too long | too long | too long | too long', // will be omitted at publishing time
      'tag4',
      'tag5',
    ]

    // create draft setting tags out of limit
    const createFailedRes = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT + 1),
        },
      },
      connections
    )
    expect(createFailedRes.errors[0].extensions.code).toBe(
      'TOO_MANY_TAGS_FOR_ARTICLE'
    )

    // create draft setting tags within limit
    const draft = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT),
        },
      },
      connections
    )
    expect(draft.tags.length).toBe(MAX_TAGS_PER_ARTICLE_LIMIT)
    expect(draft.tags[0]).toBe(tags[0])
    expect(draft.tags[1]).toBe(tags[1])
    expect(draft.tags[2]).toBe(tags[2])

    // should retain the tags after setting something else, without changing tags
    const tagsResult1 = await putDraft(
      {
        draft: { id: draft.id, summary: 'any-summary' },
      },
      connections
    )
    expect(tagsResult1.tags.length).toBe(MAX_TAGS_PER_ARTICLE_LIMIT)
    expect(tagsResult1.tags[0]).toBe(tags[0])
    expect(tagsResult1.tags[1]).toBe(tags[1])

    // create draft setting tags out of limit
    const editFailedRes = await putDraft(
      {
        draft: {
          id: draft.id,
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT + 1),
        },
      },
      connections
    )
    expect(editFailedRes.errors[0].extensions.code).toBe(
      'TOO_MANY_TAGS_FOR_ARTICLE'
    )
    // reset tags
    const resetResult1 = await putDraft(
      {
        draft: { id: draft.id, tags: null as any },
      },
      connections
    )
    expect(resetResult1.tags).toBeNull()

    const resetResult2 = await putDraft(
      { draft: { id: draft.id, tags: [] } },
      connections
    )
    expect(resetResult2.tags).toBeNull()
  })

  test('edit draft license', async () => {
    const { id } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )

    const result = await putDraft({ draft: { id } }, connections)

    // default license
    expect(result.license).toBe(ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4)

    // set to CC0
    const result2 = await putDraft(
      {
        draft: { id, license: ARTICLE_LICENSE_TYPE.cc_0 as any },
      },
      connections
    )
    expect(result2.license).toBe(ARTICLE_LICENSE_TYPE.cc_0)

    // change license to CC2 should throw error
    const changeCC2Result = await putDraft(
      {
        draft: {
          id,
          license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2 as any,
        },
      },
      connections
    )
    expect(changeCC2Result.errors?.[0].extensions.code).toBe('BAD_USER_INPUT')

    // change license to ARR should succeed
    const changeResult = await putDraft(
      {
        draft: { id, license: ARTICLE_LICENSE_TYPE.arr as any },
      },
      connections
    )
    expect(changeResult.license).toBe(ARTICLE_LICENSE_TYPE.arr)

    // after changing only tags, the license and accessType should remain unchanged
    const changeTagsResult = await putDraft(
      {
        draft: { id, tags: ['arr license test'] },
      },
      connections
    )
    expect(changeTagsResult.license).toBe(ARTICLE_LICENSE_TYPE.arr)

    // reset license
    const resetResult1 = await putDraft(
      {
        draft: {
          id,
          license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4 as any,
        },
      },
      connections
    )
    expect(resetResult1.license).toBe(ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4)
  })

  test('edit draft support settings', async () => {
    const { id } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )
    const result = await putDraft({ draft: { id } }, connections)

    // default
    expect(result.requestForDonation).toBe(null)
    expect(result.replyToDonator).toBe(null)

    // set long texts (length > 140) will throw error
    const longText = 't'.repeat(141)
    const result2 = await putDraft(
      {
        draft: { id, requestForDonation: longText },
      },
      connections
    )
    expect(result2.errors).toBeDefined()
    const result3 = await putDraft(
      {
        draft: { id, replyToDonator: longText },
      },
      connections
    )
    expect(result3.errors).toBeDefined()

    // set text
    const text = 't'.repeat(140)
    const result4 = await putDraft(
      {
        draft: { id, requestForDonation: text, replyToDonator: text },
      },
      connections
    )
    expect(result4.requestForDonation).toBe(text)
    expect(result4.replyToDonator).toBe(text)
  })

  test('edit draft comment setting', async () => {
    const { id, canComment } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )
    // default
    expect(canComment).toBeTruthy()

    // turn off canComment
    const result = await putDraft(
      { draft: { id, canComment: false } },
      connections
    )

    expect(result.canComment).toBeFalsy()

    // turn on canComment
    const result2 = await putDraft(
      { draft: { id, canComment: true } },
      connections
    )

    expect(result2.canComment).toBeTruthy()
  })

  test('edit draft sensitive settings', async () => {
    const { id, sensitiveByAuthor } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )

    // default
    expect(sensitiveByAuthor).toBeFalsy()

    // turn on by author
    const result = await putDraft(
      { draft: { id, sensitive: true } },
      connections
    )
    expect(result.sensitiveByAuthor).toBeTruthy()

    // turn off by author
    const result2 = await putDraft(
      { draft: { id, sensitive: false } },
      connections
    )
    expect(result2.sensitiveByAuthor).toBeFalsy()
  })
  test('edit indent', async () => {
    const { id, indentFirstLine } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )
    expect(indentFirstLine).toBeFalsy()

    const { indentFirstLine: indentFirstLineUpdated } = await putDraft(
      { draft: { id, indentFirstLine: true } },
      connections
    )
    expect(indentFirstLineUpdated).toBeTruthy()
  })

  test('version conflict detection', async () => {
    // Create a new draft
    const { id } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )

    // Get the current version of the draft
    const currentDraft = await putDraft({ draft: { id } }, connections)
    const currentUpdateTime = currentDraft.updatedAt

    // Try to update with correct timestamp - should succeed
    const updateResult = await putDraft(
      {
        draft: {
          id,
          title: 'Updated with correct timestamp',
          lastUpdatedAt: currentUpdateTime,
        },
      },
      connections
    )
    expect(updateResult.title).toBe('Updated with correct timestamp')
    expect(updateResult.errors).toBeUndefined()

    // Try to update with incorrect timestamp - should fail with version conflict error
    const oldTimestamp = new Date(currentUpdateTime)
    oldTimestamp.setMinutes(oldTimestamp.getMinutes() - 5) // 5 minutes earlier

    const conflictResult = await putDraft(
      {
        draft: {
          id,
          title: 'This update should fail',
          lastUpdatedAt: oldTimestamp,
        },
      },
      connections
    )

    expect(conflictResult.errors).toBeDefined()
    expect(conflictResult.errors[0].message).toBe(
      'Draft has been modified by another session'
    )

    // Update without timestamp should still work (no version checking)
    const noTimestampResult = await putDraft(
      {
        draft: {
          id,
          title: 'Update without timestamp check',
        },
      },
      connections
    )
    expect(noTimestampResult.title).toBe('Update without timestamp check')
    expect(noTimestampResult.errors).toBeUndefined()
  })

  test('version conflict with concurrent updates', async () => {
    // Create a new draft
    const { id } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
      connections
    )

    // Get the current version
    const currentDraft = await putDraft({ draft: { id } }, connections)
    const initialTimestamp = currentDraft.updatedAt

    // First update changes the draft and advances the version
    const firstUpdate = await putDraft(
      {
        draft: {
          id,
          title: 'First concurrent update',
        },
      },
      connections
    )
    expect(firstUpdate.title).toBe('First concurrent update')
    expect(firstUpdate.updatedAt).not.toEqual(initialTimestamp)

    // Second update tries to use the original timestamp, but should fail
    // because the draft has already been modified
    const secondUpdate = await putDraft(
      {
        draft: {
          id,
          title: 'Second update with outdated timestamp',
          lastUpdatedAt: initialTimestamp,
        },
      },
      connections
    )

    expect(secondUpdate.errors).toBeDefined()
    expect(secondUpdate.errors[0].message).toBe(
      'Draft has been modified by another session'
    )

    // Verify the title wasn't changed by the failed update
    const finalDraft = await putDraft({ draft: { id } }, connections)
    expect(finalDraft.title).toBe('First concurrent update')
  })

  test('edit campaigns', async () => {
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
    const user = await atomService.userIdLoader.load('1')
    await campaignService.apply(campaign, user)

    const campaignGlobalId = toGlobalId({
      type: NODE_TYPES.Campaign,
      id: campaign.id,
    })
    const stageGlobalId = toGlobalId({
      type: NODE_TYPES.CampaignStage,
      id: stages[0].id,
    })
    const { id: draftId, campaigns } = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          campaigns: [
            {
              campaign: campaignGlobalId,
              stage: stageGlobalId,
            },
          ],
        },
        client: {
          context: {
            viewer: user,
          },
        },
      },
      connections
    )
    expect(campaigns[0].campaign.id).toBe(campaignGlobalId)
    expect(campaigns[0].stage.id).toBe(stageGlobalId)

    // remove stage
    const { campaigns: campaigns2 } = await putDraft(
      { draft: { id: draftId, campaigns: [{ campaign: campaignGlobalId }] } },
      connections
    )
    expect(campaigns2[0].stage).toBeNull()
  })

  test('edit draft connections', async () => {
    const connectionIds = ['3', '4', '5', '6', '2']
    const connectionGlobalIds = connectionIds.map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )

    // create draft setting connections out of limit
    const createFailedRes = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
      connections
    )
    expect(createFailedRes.errors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // create draft setting connections within limit
    const createSucceedRes = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT
          ),
        },
      },
      connections
    )
    expect(createSucceedRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT
    )
    expect([
      createSucceedRes.connections.edges[0].node.id,
      createSucceedRes.connections.edges[1].node.id,
      createSucceedRes.connections.edges[2].node.id,
    ]).toEqual(connectionGlobalIds.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT))

    const draftId = createSucceedRes.id

    // should retain the connections after setting something else, without changing connections
    const editRes = await putDraft(
      {
        draft: { id: draftId, summary: 'any-summary' },
      },
      connections
    )
    expect(editRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT
    )
    expect([
      editRes.connections.edges[0].node.id,
      editRes.connections.edges[1].node.id,
      editRes.connections.edges[2].node.id,
    ]).toEqual(connectionGlobalIds.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT))

    // edit draft setting connections out of limit
    const editFailedRes = await putDraft(
      {
        draft: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
      connections
    )
    expect(editFailedRes.errors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // edit draft setting connections within limit
    const editSucceedRes = await putDraft(
      {
        draft: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT
          ),
        },
      },
      connections
    )
    expect(editSucceedRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT
    )
    expect([
      editSucceedRes.connections.edges[0].node.id,
      editSucceedRes.connections.edges[1].node.id,
      editSucceedRes.connections.edges[2].node.id,
    ]).toEqual(connectionGlobalIds.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT))

    // out of limit connections can remain
    await atomService.update({
      table: 'draft',
      where: { id: fromGlobalId(draftId).id },
      data: {
        connections: connectionIds.slice(
          0,
          MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
        ),
      },
    })
    const remainRes = await putDraft(
      {
        draft: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
      connections
    )

    expect(remainRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
    )
    expect([
      remainRes.connections.edges[0].node.id,
      remainRes.connections.edges[1].node.id,
      remainRes.connections.edges[2].node.id,
      remainRes.connections.edges[3].node.id,
    ]).toEqual(
      connectionGlobalIds.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT + 1)
    )

    // out of limit connections can not increase
    const increaseRes = await putDraft(
      {
        draft: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 2
          ),
        },
      },
      connections
    )
    expect(increaseRes.errors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // out of limit connections can decrease
    const decreaseRes = await putDraft(
      {
        draft: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT - 1
          ),
        },
      },
      connections
    )
    expect(decreaseRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT - 1
    )

    // reset connections
    const resetResult1 = await putDraft(
      {
        draft: { id: draftId, connections: [] },
      },
      connections
    )
    expect(resetResult1.connections.totalCount).toBe(0)

    const resetResult2 = await putDraft(
      {
        draft: { id: draftId, connections: null as any },
      },
      connections
    )
    expect(resetResult2.connections.totalCount).toBe(0)
  })

  test('collection field is deprecated but still functional', async () => {
    const connectionIds = ['3', '4', '5']
    const connectionGlobalIds = connectionIds.map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )

    // create draft using deprecated collection field
    const createRes = await putDraft(
      {
        draft: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          collection: connectionGlobalIds,
        },
      },
      connections
    )
    expect(createRes.collection.totalCount).toBe(connectionIds.length)
    expect(createRes.connections.totalCount).toBe(connectionIds.length)
    expect([
      createRes.collection.edges[0].node.id,
      createRes.collection.edges[1].node.id,
      createRes.collection.edges[2].node.id,
    ]).toEqual(connectionGlobalIds)

    // edit draft using deprecated collection field
    const editRes = await putDraft(
      {
        draft: {
          id: createRes.id,
          collection: connectionGlobalIds.slice(0, 2),
        },
      },
      connections
    )
    expect(editRes.collection.totalCount).toBe(2)
    expect(editRes.connections.totalCount).toBe(2)
    expect([
      editRes.collection.edges[0].node.id,
      editRes.collection.edges[1].node.id,
    ]).toEqual(connectionGlobalIds.slice(0, 2))
  })
})
