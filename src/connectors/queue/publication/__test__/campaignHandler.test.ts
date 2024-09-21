import type { Article, Connections } from 'definitions'
import { CampaignHandler } from '../campaignHandler'
import { closeConnections, genConnections } from 'connectors/__test__/utils'
import { CampaignService } from 'connectors/campaignService'
import { ARTICLE_STATE } from 'common/enums'
import { shortHash } from 'common/utils'

let connections: Connections

beforeAll(async () => {
  connections = await genConnections()
}, 30_000)

afterAll(async () => {
  await closeConnections(connections)
})

it('can submit article to campaign', async () => {
  const [article] = await connections.knex.table<Article>('article').insert({
    authorId: '1',
    state: ARTICLE_STATE.active,
    shortHash: shortHash(),
  }).returning('*')
  const mock = {
    submitArticleToCampaign: jest.fn(),
  } as unknown as jest.Mocked<CampaignService>
  const handler = new CampaignHandler(mock, connections.redis)
  await handler.handle(article, [
    { campaign: '1', stage: '1' },
  ])
  expect(mock.submitArticleToCampaign).toHaveBeenCalled()
})

it('can submit article to multiple campaigns', async () => {
  const [article] = await connections.knex.table<Article>('article').insert({
    authorId: '1',
    state: ARTICLE_STATE.active,
    shortHash: shortHash(),
  }).returning('*')
  const mock = {
    submitArticleToCampaign: jest.fn(),
  } as unknown as jest.Mocked<CampaignService>
  const handler = new CampaignHandler(mock, connections.redis)
  await handler.handle(article, [
    { campaign: '1', stage: '1' },
    { campaign: '2', stage: '2' },
  ])
  expect(mock.submitArticleToCampaign).toHaveBeenCalledTimes(2)
})

it('invalidates full query caches for the campaign', async () => {
  const [article] = await connections.knex.table<Article>('article').insert({
    authorId: '1',
    state: ARTICLE_STATE.active,
    shortHash: shortHash(),
  }).returning('*')
  const mock = {
    submitArticleToCampaign: jest.fn(),
  } as unknown as jest.Mocked<CampaignService>
  const dep = require('@matters/apollo-response-cache')
  const spy = jest.spyOn(dep, 'invalidateFQC')
  const handler = new CampaignHandler(mock, connections.redis)
  await handler.handle(article, [{ campaign: '1', stage: '1' }])
  expect(spy).toHaveBeenCalled()
})
