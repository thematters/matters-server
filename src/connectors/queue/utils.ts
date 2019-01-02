import Redis from 'ioredis'

import { environment } from 'common/environment'

console.log(environment)
export const queueSharedOpts = {
  // Reusing Redis Connections
  createClient() {
    return new Redis({
      host: environment.queueHost as string,
      port: environment.queuePort as number
    })
  }
}

export const PRIORITY = {
  LOW: 20,
  NORMAL: 15,
  MEDIUM: 10,
  HIGH: 5,
  CRITICAL: 1
}

export const JOB = {
  // notification jobs
  sendMail: 'sendMail',
  pushNotification: 'pushNotification',
  // repeat jobs
  publishPendingArticles: 'publishPendingArticles',
  computeGravity: 'computeGravity'
}
