import { invalidateFQC } from '@matters/apollo-response-cache'
import Queue from 'bull'

import {
  CACHE_PREFIX,
  CACHE_TTL,
  NODE_TYPES,
  QUEUE_JOB,
  QUEUE_NAME,
  QUEUE_PRIORITY,
} from 'common/enums'
import { CacheService } from 'connectors'

import { BaseQueue } from './baseQueue'

interface LikeData {
  likerId: string
  likerIp?: string
  userAgent: string
  authorLikerId: string
  url: string
  amount: number
}

interface SendPVData {
  likerId?: string
  likerIp?: string
  userAgent: string
  authorLikerId: string
  url: string
}

interface GetCivicLikerData {
  userId: string
  likerId: string
}

class LikeCoinQueue extends BaseQueue {
  constructor() {
    super(QUEUE_NAME.likecoin)
    this.addConsumers()
  }
  /**
   * Producers
   */
  like = (data: LikeData) => {
    return this.q.add(QUEUE_JOB.like, data, {
      priority: QUEUE_PRIORITY.NORMAL,
      attempts: 1,
    })
  }

  sendPV = (data: SendPVData) => {
    return this.q.add(QUEUE_JOB.sendPV, data, {
      priority: QUEUE_PRIORITY.NORMAL,
      attempts: 1,
    })
  }

  getCivicLiker = (data: GetCivicLikerData) => {
    return this.q.add(QUEUE_JOB.getCivicLiker, data, {
      priority: QUEUE_PRIORITY.NORMAL,
      attempts: 1,
    })
  }

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.like, 25, this.handleLike)
    this.q.process(QUEUE_JOB.sendPV, 25, this.handleSendPV)
    this.q.process(QUEUE_JOB.getCivicLiker, 25, this.handleGetCivicLiker)
  }

  private handleLike: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const { likerId } = job.data as LikeData
    const liker = await this.userService.findLiker({ likerId })

    if (!liker) {
      return done(new Error(`liker (${likerId}) not found.`))
    }

    const result = await this.userService.likecoin.like({
      liker,
      ...(job.data as LikeData),
    })
    job.progress(100)
    done(null, result)
  }

  private handleSendPV: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const { likerId } = job.data as SendPVData

    const liker = await this.userService.findLiker({ likerId })

    const result = await this.userService.likecoin.count({
      liker: liker || undefined,
      ...(job.data as SendPVData),
    })

    job.progress(100)
    done(null, result)
  }

  private handleGetCivicLiker: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    const { userId, likerId } = job.data as GetCivicLikerData

    const isCivicLiker = await this.userService.likecoin.isCivicLiker({
      likerId,
    })

    await invalidateFQC({
      node: { type: NODE_TYPES.User, id: userId },
      redis: this.cacheService.redis,
    })

    // update cache
    const cacheService = new CacheService(CACHE_PREFIX.CIVIC_LIKER)
    cacheService.storeObject({
      keys: { id: likerId },
      data: isCivicLiker,
      expire: CACHE_TTL.LONG,
    })

    job.progress(100)
    done(null, { likerId, isCivicLiker })
  }
}

export const likeCoinQueue = new LikeCoinQueue()
