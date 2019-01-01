import { RedisPubSub } from 'graphql-redis-subscriptions'

import { environment } from 'common/environment'

class PubSubService {
  engine: InstanceType<typeof RedisPubSub>

  constructor() {
    this.engine = new RedisPubSub({
      connection: {
        host: environment.pubSubHost as string,
        port: environment.pubSubPort as number,
        retryStrategy: (times: number) => {
          // reconnect after
          return Math.max(times * 100, 3000)
        }
      }
    })
  }
}

export const pubsubService = new PubSubService()
