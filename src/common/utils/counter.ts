import type Redis from 'ioredis'

export class RatelimitCounter {
  private redis: Redis

  public constructor(redis: Redis) {
    this.redis = redis
  }

  public increment = async (key: string) => {
    const value = await this.redis.incr(key)
    if (value === 1) {
      this.redis.expire(key, getDeltaSecondsToEndOfTheDay())
    }
    return value
  }

  public get = async (key: string) => {
    const value = await this.redis.get(key)
    return value ? parseInt(value, 10) : 0
  }
}

// helpers

const getDeltaSecondsToEndOfTheDay = () => {
  const end = new Date()
  end.setUTCHours(23, 59, 59, 999)
  const now = new Date()
  return Math.round((end.getTime() - now.getTime()) / 1000)
}
