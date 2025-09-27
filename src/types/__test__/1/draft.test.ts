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

import { testClient, genConnections, closeConnections } from '../utils.js'

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
  const PUT_DRAFT = `
    mutation($input: PutDraftInput!) {
      putDraft(input: $input) {
        id
        collection(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
        connections(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
        tags
        cover
        title
        summary
        summaryCustomized
        content
        createdAt
        sensitiveByAuthor
        license
        requestForDonation
        replyToDonator
        iscnPublish
        canComment
        indentFirstLine
        campaigns {
           campaign {
              id
              name
           }
           stage {
              id
              name
           }
        }
        collections(input: { first: 10 }) {
          totalCount
          edges {
            node {
              id
            }
          }
        }
        updatedAt
      }
    }
  `
  let server: any
  beforeAll(async () => {
    server = await testClient({
      connections,
      isAuth: true,
    })
  })
  test('edit draft summary', async () => {
    const { data, errors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })
    expect(errors).toBeUndefined()

    const summary = 'my customized summary'
    const {
      data: { putDraft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: data.putDraft.id,
          summary: summary,
        },
      },
    })
    expect(putDraft.summary).toBe(summary)
    expect(putDraft.summaryCustomized).toBe(true)

    // reset summary
    const {
      data: { putDraft: resetResult1 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: data.putDraft.id,
          summary: null as any,
        },
      },
    })
    expect(resetResult1.summary.length).toBeGreaterThan(0)
    expect(resetResult1.summaryCustomized).toBe(false)

    const {
      data: { putDraft: resetResult2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: data.putDraft.id,
          summary: '',
        },
      },
    })
    expect(resetResult2.summaryCustomized).toBe(false)
  })

  test('edit draft tags', async () => {
    const tags = ['abc', '123', 'tag4', 'tag5']

    // create draft setting tags out of limit
    const { errors: createFailedErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT + 1),
        },
      },
    })
    expect(createFailedErrors[0].extensions.code).toBe(
      'TOO_MANY_TAGS_FOR_ARTICLE'
    )

    // create draft setting tags within limit
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT),
        },
      },
    })
    expect(draft.tags.length).toBe(MAX_TAGS_PER_ARTICLE_LIMIT)
    expect(draft.tags[0]).toBe(tags[0])
    expect(draft.tags[1]).toBe(tags[1])
    expect(draft.tags[2]).toBe(tags[2])

    // should retain the tags after setting something else, without changing tags
    const {
      data: { putDraft: tagsResult1 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          summary: 'any-summary',
        },
      },
    })
    expect(tagsResult1.tags.length).toBe(MAX_TAGS_PER_ARTICLE_LIMIT)
    expect(tagsResult1.tags[0]).toBe(tags[0])
    expect(tagsResult1.tags[1]).toBe(tags[1])

    // create draft setting tags out of limit
    const { errors: editFailedErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          tags: tags.slice(0, MAX_TAGS_PER_ARTICLE_LIMIT + 1),
        },
      },
    })
    expect(editFailedErrors[0].extensions.code).toBe(
      'TOO_MANY_TAGS_FOR_ARTICLE'
    )
    // reset tags
    const {
      data: { putDraft: resetResult1 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          tags: null as any,
        },
      },
    })
    expect(resetResult1.tags).toBeNull()

    const {
      data: { putDraft: resetResult2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          tags: [],
        },
      },
    })
    expect(resetResult2.tags).toBeNull()
  })

  test('edit draft license', async () => {
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })

    // default license
    expect(draft.license).toBe(ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4)

    // set to CC0
    const {
      data: { putDraft: result2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          license: ARTICLE_LICENSE_TYPE.cc_0 as any,
        },
      },
    })
    expect(result2.license).toBe(ARTICLE_LICENSE_TYPE.cc_0)

    // change license to CC2 should throw error
    const { errors: changeCC2Errors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_2 as any,
        },
      },
    })
    expect(changeCC2Errors?.[0].extensions.code).toBe('BAD_USER_INPUT')

    // change license to ARR should succeed
    const {
      data: { putDraft: changeResult },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          license: ARTICLE_LICENSE_TYPE.arr as any,
        },
      },
    })
    expect(changeResult.license).toBe(ARTICLE_LICENSE_TYPE.arr)

    // after changing only tags, the license and accessType should remain unchanged
    const {
      data: { putDraft: changeTagsResult },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          tags: ['arr license test'],
        },
      },
    })
    expect(changeTagsResult.license).toBe(ARTICLE_LICENSE_TYPE.arr)

    // reset license
    const {
      data: { putDraft: resetResult1 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          license: ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4 as any,
        },
      },
    })
    expect(resetResult1.license).toBe(ARTICLE_LICENSE_TYPE.cc_by_nc_nd_4)
  })

  test('edit draft support settings', async () => {
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })

    // default
    expect(draft.requestForDonation).toBe(null)
    expect(draft.replyToDonator).toBe(null)

    // set long texts (length > 140) will throw error
    const longText = 't'.repeat(141)
    const { errors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          requestForDonation: longText,
        },
      },
    })
    expect(errors).toBeDefined()

    const { errors: replyToDonatorErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          replyToDonator: longText,
        },
      },
    })
    expect(replyToDonatorErrors).toBeDefined()

    // set text
    const text = 't'.repeat(140)
    const {
      data: { putDraft: result4 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          requestForDonation: text,
          replyToDonator: text,
        },
      },
    })
    expect(result4.requestForDonation).toBe(text)
    expect(result4.replyToDonator).toBe(text)
  })

  test('edit draft comment setting', async () => {
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })

    // default
    expect(draft.canComment).toBeTruthy()

    // turn off canComment
    const {
      data: { putDraft: result },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          canComment: false,
        },
      },
    })

    expect(result.canComment).toBeFalsy()

    // turn on canComment
    const {
      data: { putDraft: result2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          canComment: true,
        },
      },
    })

    expect(result2.canComment).toBeTruthy()
  })

  test('edit draft sensitive settings', async () => {
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })

    // default
    expect(draft.sensitiveByAuthor).toBeFalsy()

    // turn on by author
    const {
      data: { putDraft: result },
      errors,
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          sensitive: true,
        },
      },
    })
    expect(errors).toBeUndefined()
    expect(result.sensitiveByAuthor).toBeTruthy()

    // turn off by author
    const {
      data: { putDraft: result2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          sensitive: false,
        },
      },
    })
    expect(result2.sensitiveByAuthor).toBeFalsy()
  })
  test('edit indent', async () => {
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })
    expect(draft.indentFirstLine).toBeFalsy()

    const {
      data: { putDraft: result2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          indentFirstLine: true,
        },
      },
    })
    expect(result2.indentFirstLine).toBeTruthy()
  })

  test('does not auto set cover from content images', async () => {
    const contentWithImage =
      '<p>content with image</p><img data-asset-id="00000000-0000-0000-0000-000000000001" alt="img" />'

    const { data, errors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: 'Draft without explicit cover',
          content: contentWithImage,
        },
      },
    })

    expect(errors).toBeUndefined()
    expect(data?.putDraft?.cover).toBeNull()
  })

  test('version conflict detection', async () => {
    // Create a new draft
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })

    // Get the current version of the draft
    const {
      data: { putDraft: currentDraft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
        },
      },
    })
    const currentUpdateTime = currentDraft.updatedAt

    // Try to update with correct timestamp - should succeed
    const {
      errors: updateErrors,
      data: { putDraft: updateResult },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          title: 'Updated with correct timestamp',
          lastUpdatedAt: currentUpdateTime,
        },
      },
    })
    expect(updateResult.title).toBe('Updated with correct timestamp')
    expect(updateErrors).toBeUndefined()

    // Try to update with incorrect timestamp - should fail with version conflict error
    const oldTimestamp = new Date(currentUpdateTime)
    oldTimestamp.setMinutes(oldTimestamp.getMinutes() - 5) // 5 minutes earlier

    const { errors: conflictErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          title: 'This update should fail',
          lastUpdatedAt: oldTimestamp,
        },
      },
    })

    expect(conflictErrors).toBeDefined()
    expect(conflictErrors[0].message).toBe(
      'Draft has been modified by another session'
    )

    // Update without timestamp should still work (no version checking)
    const {
      data: { putDraft: noTimestampResult },
      errors: noTimestampErrors,
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          title: 'Update without timestamp check',
        },
      },
    })
    expect(noTimestampResult.title).toBe('Update without timestamp check')
    expect(noTimestampErrors).toBeUndefined()
  })

  test('version conflict with concurrent updates', async () => {
    // Create a new draft
    const {
      data: { putDraft: draft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
        },
      },
    })

    // Get the current version
    const {
      data: { putDraft: currentDraft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
        },
      },
    })
    const initialTimestamp = currentDraft.updatedAt

    // First update changes the draft and advances the version
    const {
      data: { putDraft: firstUpdate },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          title: 'First concurrent update',
        },
      },
    })
    expect(firstUpdate.title).toBe('First concurrent update')
    expect(firstUpdate.updatedAt).not.toEqual(initialTimestamp)

    // Second update tries to use the original timestamp, but should fail
    // because the draft has already been modified
    const { errors: secondUpdateErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
          title: 'Second update with outdated timestamp',
          lastUpdatedAt: initialTimestamp,
        },
      },
    })

    expect(secondUpdateErrors).toBeDefined()
    expect(secondUpdateErrors[0].message).toBe(
      'Draft has been modified by another session'
    )

    // Verify the title wasn't changed by the failed update
    const {
      data: { putDraft: finalDraft },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draft.id,
        },
      },
    })
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
    const {
      data: {
        putDraft: { id: draftId, campaigns },
      },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
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
    })
    expect(campaigns[0].campaign.id).toBe(campaignGlobalId)
    expect(campaigns[0].stage.id).toBe(stageGlobalId)

    // remove stage
    const { errors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          campaigns: [{ campaign: campaignGlobalId }],
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('edit draft connections', async () => {
    const connectionIds = ['3', '4', '5', '6', '2']
    const connectionGlobalIds = connectionIds.map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )

    // create draft setting connections out of limit
    const { errors: createFailedErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
    })
    expect(createFailedErrors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // create draft setting connections within limit
    const {
      data: { putDraft: createSucceedRes },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT
          ),
        },
      },
    })
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
    const {
      data: { putDraft: editRes },
      errors: editErrors,
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          summary: 'any-summary',
        },
      },
    })
    expect(editErrors).toBeUndefined()
    expect(editRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT
    )
    expect([
      editRes.connections.edges[0].node.id,
      editRes.connections.edges[1].node.id,
      editRes.connections.edges[2].node.id,
    ]).toEqual(connectionGlobalIds.slice(0, MAX_ARTICLES_PER_CONNECTION_LIMIT))

    // edit draft setting connections out of limit
    const { errors: editFailedErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
    })
    expect(editFailedErrors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // edit draft setting connections within limit
    const {
      data: { putDraft: editSucceedRes },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT
          ),
        },
      },
    })
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
    const {
      data: { putDraft: remainRes },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 1
          ),
        },
      },
    })

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
    const { errors: increaseErrors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT + 2
          ),
        },
      },
    })
    expect(increaseErrors[0].extensions.code).toBe(
      'ARTICLE_COLLECTION_REACH_LIMIT'
    )

    // out of limit connections can decrease
    const {
      data: { putDraft: decreaseRes },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: connectionGlobalIds.slice(
            0,
            MAX_ARTICLES_PER_CONNECTION_LIMIT - 1
          ),
        },
      },
    })
    expect(decreaseRes.connections.totalCount).toBe(
      MAX_ARTICLES_PER_CONNECTION_LIMIT - 1
    )

    // reset connections
    const {
      data: { putDraft: resetResult1 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: [],
        },
      },
    })
    expect(resetResult1.connections.totalCount).toBe(0)

    const {
      data: { putDraft: resetResult2 },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: draftId,
          connections: null as any,
        },
      },
    })
    expect(resetResult2.connections.totalCount).toBe(0)
  })

  test('collection field is deprecated but still functional', async () => {
    const connectionIds = ['3', '4', '5']
    const connectionGlobalIds = connectionIds.map((id) =>
      toGlobalId({ type: NODE_TYPES.Article, id })
    )

    // create draft using deprecated collection field
    const {
      data: { putDraft: createRes },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          collection: connectionGlobalIds,
        },
      },
    })
    expect(createRes.collection.totalCount).toBe(connectionIds.length)
    expect(createRes.connections.totalCount).toBe(connectionIds.length)
    expect([
      createRes.collection.edges[0].node.id,
      createRes.collection.edges[1].node.id,
      createRes.collection.edges[2].node.id,
    ]).toEqual(connectionGlobalIds)

    // edit draft using deprecated collection field
    const {
      data: { putDraft: editRes },
    } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          id: createRes.id,
          collection: connectionGlobalIds.slice(0, 2),
        },
      },
    })
    expect(editRes.collection.totalCount).toBe(2)
    expect(editRes.connections.totalCount).toBe(2)
    expect([
      editRes.collection.edges[0].node.id,
      editRes.collection.edges[1].node.id,
    ]).toEqual(connectionGlobalIds.slice(0, 2))
  })

  test('rejects invalid connection types', async () => {
    // Create a draft with an invalid connection type (User instead of Article)
    const invalidConnectionId = toGlobalId({
      type: NODE_TYPES.Collection,
      id: '1',
    })

    const { errors } = await server.executeOperation({
      query: PUT_DRAFT,
      variables: {
        input: {
          title: Math.random().toString(),
          content: Math.random().toString(),
          connections: [invalidConnectionId],
        },
      },
    })

    expect(errors).toBeDefined()
    expect(errors[0].extensions.code).toBe('BAD_USER_INPUT')
  })
  describe('collections', () => {
    test('should add draft to collections', async () => {
      const user = await atomService.userIdLoader.load('1')
      // Create test collections
      const collection1 = await atomService.create({
        table: 'collection',
        data: {
          title: 'Test Collection 1',
          authorId: user.id,
        },
      })
      const collection2 = await atomService.create({
        table: 'collection',
        data: {
          title: 'Test Collection 2',
          authorId: user.id,
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        context: { viewer: user },
      })

      const { data, errors } = await server.executeOperation({
        query: PUT_DRAFT,
        variables: {
          input: {
            title: 'Test Draft',
            content: 'Test content',
            collections: [
              toGlobalId({ type: NODE_TYPES.Collection, id: collection1.id }),
              toGlobalId({ type: NODE_TYPES.Collection, id: collection2.id }),
            ],
          },
        },
      })

      expect(errors).toBeUndefined()
      expect(data?.putDraft).toBeDefined()
      expect(data?.putDraft.collections.edges).toHaveLength(2)
      expect(data?.putDraft.collections.edges[0].node.id).toBe(
        toGlobalId({ type: NODE_TYPES.Collection, id: collection1.id })
      )
      expect(data?.putDraft.collections.edges[1].node.id).toBe(
        toGlobalId({ type: NODE_TYPES.Collection, id: collection2.id })
      )
    })

    test('should not allow adding to collections owned by other users', async () => {
      // Create test collection owned by another user
      const author = await atomService.userIdLoader.load('1')
      const user = await atomService.userIdLoader.load('2')
      const collection = await atomService.create({
        table: 'collection',
        data: {
          title: 'Test Collection',
          authorId: author.id,
        },
      })

      const server = await testClient({
        connections,
        isAuth: true,
        context: { viewer: user },
      })

      const { errors } = await server.executeOperation({
        query: PUT_DRAFT,
        variables: {
          input: {
            title: 'Test Draft',
            content: 'Test content',
            collections: [
              toGlobalId({ type: NODE_TYPES.Collection, id: collection.id }),
            ],
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
    })

    test('should handle non-existent collections', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
      })

      const { errors } = await server.executeOperation({
        query: PUT_DRAFT,
        variables: {
          input: {
            title: 'Test Draft',
            content: 'Test content',
            collections: [
              toGlobalId({
                type: NODE_TYPES.Collection,
                id: '0',
              }),
            ],
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })

    test('should handle invalid collection type', async () => {
      const server = await testClient({
        connections,
        isAuth: true,
      })

      const { errors } = await server.executeOperation({
        query: PUT_DRAFT,
        variables: {
          input: {
            title: 'Test Draft',
            content: 'Test content',
            collections: [toGlobalId({ type: NODE_TYPES.Article, id: '1' })],
          },
        },
      })

      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    })
  })
})
