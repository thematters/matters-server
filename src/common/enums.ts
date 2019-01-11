export const USER_ACTION = {
  appreciate: 'appreciate',
  follow: 'follow',
  subscribe: 'subscribe',
  rate: 'rate',
  upVote: 'up_vote',
  downVote: 'down_vote',
  finish: 'finish'
}

export const TRANSACTION_PURPOSE = {
  appreciate: 'appreciate',
  invitationAccepted: 'invitation-accepted',
  joinByInvitation: 'join-by-invitation',
  joinByTask: 'join-by-task'
}

export const VOTE = {
  up: 'up',
  down: 'down'
}

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned'
}

export const PUBLISH_STATE = {
  draft: 'draft',
  pending: 'pending',
  error: 'error',
  published: 'published'
}

export const BCRYPT_ROUNDS = 12

export const BATCH_SIZE = 10

export const LOCAL_S3_ENDPOINT = 'http://localhost:4569'

export const MAT_UNIT = {
  invitationCalculate: 20,
  invitationAccepted: 5,
  joinByInvitation: 5,
  joinByTask: 10
}

export const ARTICLE_APPRECIATE_LIMIT = 5
export const ARTICLE_PIN_COMMENT_LIMIT = 3

export const QUEUE_PRIORITY = {
  LOW: 20,
  NORMAL: 15,
  MEDIUM: 10,
  HIGH: 5,
  CRITICAL: 1
}

export const QUEUE_JOB = {
  // publication job
  publishArticle: 'publishArticle',
  // notification jobs
  sendMail: 'sendMail',
  pushNotification: 'pushNotification',
  // repeat jobs
  publishPendingDrafts: 'publishPendingDrafts'
}

export const QUEUE_NAME = {
  notification: 'notification',
  publication: 'publication',
  schedule: 'schedule'
}

export const QUEUE_CONCURRENCY = {
  publishArticle: 100
}

export const PUBLISH_ARTICLE_DELAY = 1000 * 60 * 2
