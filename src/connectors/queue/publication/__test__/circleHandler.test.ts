import { closeConnections, genConnections } from 'connectors/__test__/utils'
import { AtomService } from 'connectors/atomService'
import type { Connections } from 'definitions'
import { CircleHandler } from '../circleHandler'
import { UserService } from 'connectors/userService'
import { NotificationService } from 'connectors/notificationService'
import { ARTICLE_ACCESS_TYPE, ARTICLE_LICENSE_TYPE, PAYMENT_PROVIDER } from 'common/enums'
import { shortHash } from 'common/utils'

let connections: Connections
let atomService: AtomService

beforeAll(async () => {
  connections = await genConnections()
  atomService = new AtomService(connections)
}, 30_000)

afterAll(async () => {
  await closeConnections(connections)
})

it('skips handling when article version does not belong to a circle', async () => {
  // setup dependencies
  const mockUserService = {
    findCircleRecipients: jest.fn(),
  } as unknown as jest.Mocked<UserService>
  const mockNotificationService = {
    trigger: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>

  // setup data for testing
  const article = await atomService.create({
    table: 'article',
    data: { authorId: '1' },
  })
  const content = await atomService.create({
    table: 'article_content',
    data: { content: 'Hello, world!', hash: shortHash() },
  })
  const articleVersion = await atomService.create({
    table: 'article_version',
    data: {
      articleId: article.id,
      title: 'Greeting',
      summary: 'Hello, world!',
      summaryCustomized: false,
      contentId: content.id,
      tags: [],
      connections: [],
      wordCount: 10,
      access: ARTICLE_ACCESS_TYPE.public,
      license: ARTICLE_LICENSE_TYPE.cc_0,
      canComment: true,
      sensitiveByAuthor: false,
    },
  })

  // assert that nothing happens
  const handler = new CircleHandler(mockUserService, atomService, mockNotificationService, connections.redis)
  await handler.handle(article, articleVersion)
  expect(mockUserService.findCircleRecipients).not.toHaveBeenCalled()
  expect(mockNotificationService.trigger).not.toHaveBeenCalled()
})

it('persists article access policy to circle', async () => {
  // setup dependencies
  const mockUserService = {
    findCircleRecipients: jest.fn(),
  } as unknown as jest.Mocked<UserService>
  const mockNotificationService = {
    trigger: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>
  mockUserService.findCircleRecipients.mockImplementationOnce(async () => [])

  // setup data for testing
  const circle = await atomService.create({
    table: 'circle',
    data: {
      name: 'circle-test-persist',
      owner: '1',
      displayName: 'Circle',
      provider: PAYMENT_PROVIDER.stripe,
      providerProductId: '__mock_stripe_circle_test_persist',
    },
  })
  const article = await atomService.create({
    table: 'article',
    data: { authorId: '1' },
  })
  const content = await atomService.create({
    table: 'article_content',
    data: { content: 'Hello, world!', hash: shortHash() },
  })
  const articleVersion = await atomService.create({
    table: 'article_version',
    data: {
      articleId: article.id,
      title: 'Greeting',
      summary: 'Hello, world!',
      summaryCustomized: false,
      contentId: content.id,
      tags: [],
      connections: [],
      wordCount: 10,
      access: ARTICLE_ACCESS_TYPE.public,
      license: ARTICLE_LICENSE_TYPE.cc_0,
      canComment: true,
      sensitiveByAuthor: false,
      circleId: circle.id,
    },
  })

  // assert that the policy has been persisted
  const handler = new CircleHandler(mockUserService, atomService, mockNotificationService, connections.redis)
  await handler.handle(article, articleVersion)
  const expected = atomService.findFirst({
    table: 'article_circle',
    where: {
      articleId: article.id,
      circleId: circle.id,
      access: ARTICLE_ACCESS_TYPE.public,
    },
  })
  expect(expected).not.toBeNull()
})

it('updates article access policy to circle', async () => {
  // setup dependencies
  const mockUserService = {
    findCircleRecipients: jest.fn(),
  } as unknown as jest.Mocked<UserService>
  const mockNotificationService = {
    trigger: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>
  mockUserService.findCircleRecipients.mockImplementationOnce(async () => [])

  // setup the data for testing
  const circle = await atomService.create({
    table: 'circle',
    data: {
      name: 'circle-test-update',
      owner: '1',
      displayName: 'Circle',
      provider: PAYMENT_PROVIDER.stripe,
      providerProductId: '__mock_stripe_circle_test_update',
    },
  })
  const article = await atomService.create({
    table: 'article',
    data: { authorId: '1' },
  })
  const content = await atomService.create({
    table: 'article_content',
    data: { content: 'Hello, world!', hash: shortHash() },
  })
  const articleVersion = await atomService.create({
    table: 'article_version',
    data: {
      articleId: article.id,
      title: 'Greeting',
      summary: 'Hello, world!',
      summaryCustomized: false,
      contentId: content.id,
      tags: [],
      connections: [],
      wordCount: 10,
      access: ARTICLE_ACCESS_TYPE.paywall,
      license: ARTICLE_LICENSE_TYPE.cc_0,
      canComment: true,
      sensitiveByAuthor: false,
      circleId: circle.id,
    },
  })

  // given that we've already been persisted the article for the circle before
  await atomService.create({
    table: 'article_circle',
    data: {
      articleId: article.id,
      circleId: circle.id,
      access: ARTICLE_ACCESS_TYPE.public,
    },
  })

  // assert that the article access policy should be in-place updated
  const handler = new CircleHandler(mockUserService, atomService, mockNotificationService, connections.redis)
  await handler.handle(article, articleVersion)
  const records = await atomService.findMany({
    table: 'article_circle',
    where: {
      articleId: article.id,
      circleId: circle.id,
    },
  })
  expect(records).toHaveLength(1)
  expect(records[0]).toMatchObject({ access: ARTICLE_ACCESS_TYPE.paywall })
})

it('notifies circle members and followers', async () => {
  // setup dependencies
  const mockUserService = {
    findCircleRecipients: jest.fn(),
  } as unknown as jest.Mocked<UserService>
  const mockNotificationService = {
    trigger: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>

  mockUserService.findCircleRecipients.mockImplementationOnce(async () => ['1', '2', '3'])

  // setup the data for testing
  const circle = await atomService.create({
    table: 'circle',
    data: {
      name: 'circle-test-notification',
      owner: '1',
      displayName: 'Circle',
      provider: PAYMENT_PROVIDER.stripe,
      providerProductId: '__mock_stripe_circle_test_notification',
    },
  })
  const article = await atomService.create({
    table: 'article',
    data: { authorId: '1' },
  })
  const content = await atomService.create({
    table: 'article_content',
    data: { content: 'Hello, world!', hash: shortHash() },
  })
  const articleVersion = await atomService.create({
    table: 'article_version',
    data: {
      articleId: article.id,
      title: 'Greeting',
      summary: 'Hello, world!',
      summaryCustomized: false,
      contentId: content.id,
      tags: [],
      connections: [],
      wordCount: 10,
      access: ARTICLE_ACCESS_TYPE.paywall,
      license: ARTICLE_LICENSE_TYPE.cc_0,
      canComment: true,
      sensitiveByAuthor: false,
      circleId: circle.id,
    },
  })

  // assert that the notification service should be triggered 3 times
  const handler = new CircleHandler(mockUserService, atomService, mockNotificationService, connections.redis)
  await handler.handle(article, articleVersion)
  expect(mockNotificationService.trigger).toHaveBeenCalledTimes(3)
})

it('invalidates full query cache for circle', async () => {
  // setup dependencies
  const mockUserService = {
    findCircleRecipients: jest.fn(),
  } as unknown as jest.Mocked<UserService>
  const mockNotificationService = {
    trigger: jest.fn(),
  } as unknown as jest.Mocked<NotificationService>

  mockUserService.findCircleRecipients.mockImplementationOnce(async () => [])

  // setup the data for testing
  const circle = await atomService.create({
    table: 'circle',
    data: {
      name: 'circle-test-cache',
      owner: '1',
      displayName: 'Circle',
      provider: PAYMENT_PROVIDER.stripe,
      providerProductId: '__mock_stripe_circle_test_cache',
    },
  })
  const article = await atomService.create({
    table: 'article',
    data: { authorId: '1' },
  })
  const content = await atomService.create({
    table: 'article_content',
    data: { content: 'Hello, world!', hash: shortHash() },
  })
  const articleVersion = await atomService.create({
    table: 'article_version',
    data: {
      articleId: article.id,
      title: 'Greeting',
      summary: 'Hello, world!',
      summaryCustomized: false,
      contentId: content.id,
      tags: [],
      connections: [],
      wordCount: 10,
      access: ARTICLE_ACCESS_TYPE.paywall,
      license: ARTICLE_LICENSE_TYPE.cc_0,
      canComment: true,
      sensitiveByAuthor: false,
      circleId: circle.id,
    },
  })

  // assert that the cache should be invalidated
  const dep = require('@matters/apollo-response-cache')
  const spy = jest.spyOn(dep, 'invalidateFQC')
  const handler = new CircleHandler(mockUserService, atomService, mockNotificationService, connections.redis)
  await handler.handle(article, articleVersion)
  expect(spy).toHaveBeenCalled()
})
