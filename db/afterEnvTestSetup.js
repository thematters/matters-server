const Redis = require('ioredis')
const { RedisMemoryServer } = require('redis-memory-server')

const { sharedQueueOpts } = require('connectors/queue/utils')

const redisServer = new RedisMemoryServer()

beforeAll(async () => {
  // isolate redis server between tests

  const redisPort = await redisServer.getPort()
  const redisHost = await redisServer.getHost()
  jest.spyOn(sharedQueueOpts, 'createClient').mockImplementation(() => {
    return new Redis(redisPort, redisHost, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    })
  })
}, 10000)
