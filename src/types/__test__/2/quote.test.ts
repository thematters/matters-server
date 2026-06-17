import type { Connections, Campaign, Article } from '#definitions/index.js'

import {
  NODE_TYPES,
  USER_STATE,
  CAMPAIGN_STATE,
  QUOTE_STATE,
  QUOTE_DAILY_LIMIT,
  QUOTE_PER_ARTICLE_LIMIT,
} from '#common/enums/index.js'
import { toGlobalId, fromGlobalId } from '#common/utils/index.js'
import { AtomService, CampaignService } from '#connectors/index.js'

import { genConnections, closeConnections, testClient } from '../utils.js'

let connections: Connections
let atomService: AtomService
let campaignService: CampaignService

// seed article #1 (author = user #1, license cc_by_nc_nd_4) has content
// "<div>some html string</div>". excerpts below are all valid sub-strings,
// which matters because putQuote rejects anything that is not an excerpt.
const ARTICLE_DB_ID = '1'
const articleGlobalId = toGlobalId({
  type: NODE_TYPES.Article,
  id: ARTICLE_DB_ID,
})

// poster is user #2 so that "poster", "article author" and "other" are three
// distinct identities for the deleteQuote permission matrix.
const posterUser = { id: '2', state: USER_STATE.active, userName: 'test2' }

const campaignData = {
  name: 'quote test campaign',
  applicationPeriod: [new Date('2024-01-01'), new Date('2024-01-02')] as const,
  writingPeriod: [new Date('2024-01-03'), new Date('2024-01-04')] as const,
  creatorId: '1',
  state: CAMPAIGN_STATE.active,
  // the quote wall is opt-in per campaign; the seed campaign has it enabled
  enableQuoteWall: true,
}

let campaign: Campaign

// put the seed article onto a campaign wall so putQuote's campaign gate passes
const setupCampaignWithArticle = async () => {
  const article = (await atomService.findFirst({
    table: 'article',
    where: { id: ARTICLE_DB_ID },
  })) as Article
  const _campaign = await campaignService.createWritingChallenge(campaignData)
  const _stages = await campaignService.updateStages(_campaign.id, [
    { name: 'stage1' },
  ])
  await campaignService.apply(_campaign, {
    id: article.authorId,
    userName: 'test1',
    state: USER_STATE.active,
  })
  await campaignService.submitArticleToCampaign(
    article,
    _campaign.id,
    _stages[0].id
  )
  return _campaign
}

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
  campaignService = new CampaignService(connections)
  campaign = await setupCampaignWithArticle()
}, 30000)

afterAll(async () => {
  await closeConnections(connections)
})

// remove every quote between tests so per-article / daily caps and dedupe
// start from a clean slate each time
afterEach(async () => {
  await connections.knex('quote').del()
})

const PUT_QUOTE = /* GraphQL */ `
  mutation ($input: PutQuoteInput!) {
    putQuote(input: $input) {
      id
      content
      article {
        id
      }
      poster {
        id
      }
    }
  }
`

const DELETE_QUOTE = /* GraphQL */ `
  mutation ($input: DeleteQuoteInput!) {
    deleteQuote(input: $input)
  }
`

// create a quote row directly, bypassing the resolver, for delete/query tests
const seedQuote = async ({
  content,
  userId = posterUser.id,
  state = QUOTE_STATE.active,
  campaignId = campaign.id,
  articleId = ARTICLE_DB_ID,
}: {
  content: string
  userId?: string
  state?: keyof typeof QUOTE_STATE
  campaignId?: string
  articleId?: string
}) =>
  atomService.create({
    table: 'quote',
    data: { content, articleId, campaignId, userId, state },
  })

describe('putQuote', () => {
  test('happy path: logged-in user puts an excerpt onto the wall', async () => {
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const content = 'some html string'
    const { errors, data } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: { input: { articleId: articleGlobalId, content } },
    })
    expect(errors).toBeUndefined()
    expect(data.putQuote.content).toBe(content)
    expect(data.putQuote.article.id).toBe(articleGlobalId)
    expect(data.putQuote.poster.id).toBe(
      toGlobalId({ type: NODE_TYPES.User, id: posterUser.id })
    )

    // persisted with the correct campaign attribution
    const { id: quoteDbId } = fromGlobalId(data.putQuote.id)
    const row = await atomService.findFirst({
      table: 'quote',
      where: { id: quoteDbId },
    })
    expect(row.campaignId).toBe(campaign.id)
    expect(row.userId).toBe(posterUser.id)
    expect(row.state).toBe(QUOTE_STATE.active)
  })

  test('rejects posting when the campaign has no quote wall', async () => {
    // temporarily disable the wall on the seed campaign
    await atomService.update({
      table: 'campaign',
      where: { id: campaign.id },
      data: { enableQuoteWall: false },
    })
    try {
      const server = await testClient({
        connections,
        context: { viewer: posterUser },
        isAuth: true,
      })
      const { errors } = await server.executeOperation({
        query: PUT_QUOTE,
        variables: {
          input: { articleId: articleGlobalId, content: 'some html string' },
        },
      })
      expect(errors).toBeDefined()
      expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
    } finally {
      // restore so the rest of the suite is unaffected
      await atomService.update({
        table: 'campaign',
        where: { id: campaign.id },
        data: { enableQuoteWall: true },
      })
    }
  })

  test('visitors are blocked by the auth directive', async () => {
    const server = await testClient({ connections, isAuth: false })
    const { errors } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: {
        input: { articleId: articleGlobalId, content: 'some html string' },
      },
    })
    expect(errors).toBeDefined()
    expect(errors.length).toBe(1)
  })

  test('content longer than the cap is rejected', async () => {
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: {
        input: { articleId: articleGlobalId, content: 'a'.repeat(81) },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('content that is not an excerpt of the article is rejected', async () => {
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: {
        input: {
          articleId: articleGlobalId,
          content: 'this text is not in the article',
        },
      },
    })
    expect(errors?.[0].extensions.code).toBe('BAD_USER_INPUT')
  })

  test('dedupe: same user + article + content is rejected on second put', async () => {
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const content = 'html string'
    const { errors: errors1 } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: { input: { articleId: articleGlobalId, content } },
    })
    expect(errors1).toBeUndefined()

    const { errors: errors2 } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: { input: { articleId: articleGlobalId, content } },
    })
    expect(errors2?.[0].extensions.code).toBe('BAD_USER_INPUT')

    // only one row persisted
    const count = await atomService.count({
      table: 'quote',
      where: { userId: posterUser.id, articleId: ARTICLE_DB_ID },
    })
    expect(count).toBe(1)
  })

  test('per-article cap blocks the next quote once the limit is reached', async () => {
    // pre-fill up to the per-article limit with distinct excerpts
    await seedQuote({ content: 'some' })
    await seedQuote({ content: 'html' })
    expect(QUOTE_PER_ARTICLE_LIMIT).toBe(2)

    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: { input: { articleId: articleGlobalId, content: 'string' } },
    })
    expect(errors?.[0].extensions.code).toBe('ACTION_LIMIT_EXCEEDED')
  })

  test('daily cap blocks the next quote once the limit is reached', async () => {
    // seed the daily limit worth of quotes for this user (today, any article)
    expect(QUOTE_DAILY_LIMIT).toBe(5)
    for (let i = 0; i < QUOTE_DAILY_LIMIT; i++) {
      await seedQuote({ content: `daily-${i}` })
    }
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: PUT_QUOTE,
      variables: { input: { articleId: articleGlobalId, content: 'string' } },
    })
    expect(errors?.[0].extensions.code).toBe('ACTION_LIMIT_EXCEEDED')
  })
})

describe('deleteQuote', () => {
  test('poster can retract their own quote', async () => {
    const quote = await seedQuote({ content: 'some html string' })
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors, data } = await server.executeOperation({
      query: DELETE_QUOTE,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Quote, id: quote.id }) },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.deleteQuote).toBe(true)

    const row = await atomService.findFirst({
      table: 'quote',
      where: { id: quote.id },
    })
    expect(row.state).toBe(QUOTE_STATE.archived)
  })

  test('a non-poster, non-author, non-admin is forbidden', async () => {
    // quote posted by user #2 on article authored by user #1; viewer is user
    // #3, who is none of poster/author/admin
    const quote = await seedQuote({ content: 'some html string' })
    const other = { id: '3', state: USER_STATE.active, userName: 'test3' }
    const server = await testClient({
      connections,
      context: { viewer: other },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: DELETE_QUOTE,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Quote, id: quote.id }) },
      },
    })
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('archived quote does not leak existence: still FORBIDDEN to outsiders', async () => {
    const quote = await seedQuote({
      content: 'some html string',
      state: QUOTE_STATE.archived,
    })
    const other = { id: '3', state: USER_STATE.active, userName: 'test3' }
    const server = await testClient({
      connections,
      context: { viewer: other },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: DELETE_QUOTE,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Quote, id: quote.id }) },
      },
    })
    // permission is checked before the idempotent short-circuit
    expect(errors?.[0].extensions.code).toBe('FORBIDDEN')
  })

  test('non-existent id yields ENTITY_NOT_FOUND', async () => {
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors } = await server.executeOperation({
      query: DELETE_QUOTE,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Quote, id: '9999999' }) },
      },
    })
    expect(errors?.[0].extensions.code).toBe('ENTITY_NOT_FOUND')
  })

  test('idempotent: deleting an already-archived quote (by poster) succeeds', async () => {
    const quote = await seedQuote({
      content: 'some html string',
      state: QUOTE_STATE.archived,
    })
    const server = await testClient({
      connections,
      context: { viewer: posterUser },
      isAuth: true,
    })
    const { errors, data } = await server.executeOperation({
      query: DELETE_QUOTE,
      variables: {
        input: { id: toGlobalId({ type: NODE_TYPES.Quote, id: quote.id }) },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.deleteQuote).toBe(true)
  })
})

describe('quotes query', () => {
  const QUERY_CAMPAIGN_QUOTES = /* GraphQL */ `
    query ($campaignInput: CampaignInput!, $quotesInput: QuotesInput!) {
      campaign(input: $campaignInput) {
        ... on WritingChallenge {
          quotes(input: $quotesInput) {
            totalCount
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              cursor
              node {
                id
                content
              }
            }
          }
        }
      }
    }
  `

  test('returns active quotes and filters out archived / banned', async () => {
    await seedQuote({ content: 'some' })
    await seedQuote({ content: 'html', state: QUOTE_STATE.archived })
    await seedQuote({ content: 'string', state: QUOTE_STATE.banned })

    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: QUERY_CAMPAIGN_QUOTES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        quotesInput: { first: 10 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign.quotes.totalCount).toBe(1)
    expect(data.campaign.quotes.edges.length).toBe(1)
    expect(data.campaign.quotes.edges[0].node.content).toBe('some')
  })

  test('pagination: after cursor advances pages and reports hasNextPage', async () => {
    await seedQuote({ content: 'some' })
    await seedQuote({ content: 'html' })

    const server = await testClient({ connections })
    const { data, errors } = await server.executeOperation({
      query: QUERY_CAMPAIGN_QUOTES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        quotesInput: { first: 1 },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign.quotes.totalCount).toBe(2)
    expect(data.campaign.quotes.edges.length).toBe(1)
    expect(data.campaign.quotes.pageInfo.hasNextPage).toBe(true)

    const { data: data2, errors: errors2 } = await server.executeOperation({
      query: QUERY_CAMPAIGN_QUOTES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        quotesInput: {
          first: 1,
          after: data.campaign.quotes.edges[0].cursor,
        },
      },
    })
    expect(errors2).toBeUndefined()
    expect(data2.campaign.quotes.edges.length).toBe(1)
    expect(data2.campaign.quotes.edges[0].node.id).not.toBe(
      data.campaign.quotes.edges[0].node.id
    )
    expect(data2.campaign.quotes.pageInfo.hasNextPage).toBe(false)
  })

  test('random mode does not error', async () => {
    await seedQuote({ content: 'some' })
    await seedQuote({ content: 'html' })

    const server = await testClient({ connections })
    const { errors, data } = await server.executeOperation({
      query: QUERY_CAMPAIGN_QUOTES,
      variables: {
        campaignInput: { shortHash: campaign.shortHash },
        quotesInput: { first: 10, random: true },
      },
    })
    expect(errors).toBeUndefined()
    expect(data.campaign.quotes.totalCount).toBe(2)
    expect(data.campaign.quotes.edges.length).toBe(2)
  })
})
