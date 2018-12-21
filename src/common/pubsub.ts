import { RedisPubSub } from 'graphql-redis-subscriptions'

const pubsub = new RedisPubSub({
  connection: {
    host: process.env['MATTERS_REDIS_HOST'] as string,
    port: (process.env['MATTERS_REDIS_PORT'] || 6379) as number,
    retryStrategy: (times: number) => {
      // reconnect after
      return Math.max(times * 100, 3000)
    }
  }
})

export default pubsub
