import Queue from 'bull'

import { QUEUE_JOB, QUEUE_NAME, QUEUE_PRIORITY } from 'common/enums'

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

  /**
   * Cusumers
   */
  private addConsumers = () => {
    this.q.process(QUEUE_JOB.like, 25, this.handleLike)
    this.q.process(QUEUE_JOB.sendPV, 25, this.handleSendPV)
  }

  private handleLike: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
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
    } catch (e) {
      done(e)
    }
  }

  private handleSendPV: Queue.ProcessCallbackFunction<unknown> = async (
    job,
    done
  ) => {
    try {
      const { likerId } = job.data as SendPVData

      const liker = await this.userService.findLiker({ likerId })

      const result = await this.userService.likecoin.count({
        liker: liker || undefined,
        ...(job.data as SendPVData),
      })

      job.progress(100)
      done(null, result)
    } catch (e) {
      done(e)
    }
  }
}

export const likeCoinQueue = new LikeCoinQueue()
