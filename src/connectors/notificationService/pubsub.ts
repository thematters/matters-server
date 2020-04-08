import { RedisPubSub } from 'graphql-redis-subscriptions'

import { environment } from 'common/environment'
import logger from 'common/logger'

class PubSub {
  engine: InstanceType<typeof RedisPubSub>

  constructor() {
    this.engine = new RedisPubSub({
      connection: {
        host: environment.pubSubHost,
        port: environment.pubSubPort,
        retryStrategy: (times: number) => {
          // reconnect after
          return Math.max(times * 100, 3000)
        },
      },
    })
  }

  publish = async (trigger: string, payload: any) => {
    try {
      this.engine.publish(trigger, payload)
    } catch (e) {
      logger.error('Publish PubSub event error.', e)
    }
  }
}

export const pubsub = new PubSub()
