import { RedisPubSub } from 'graphql-redis-subscriptions'

import { environment } from 'common/environment'

class PubSubService {
  engine: InstanceType<typeof RedisPubSub>
  publish: any
  asyncIterator: any

  constructor() {
    this.engine = this._initPubSubEngine()
    this.publish = this.engine.publish
    this.asyncIterator = this.engine.asyncIterator
  }

  /**
   * Create PubSub instance for GraphQL Subscriptions
   */
  _initPubSubEngine = () => {
    return new RedisPubSub({
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

export default PubSubService
