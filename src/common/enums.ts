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
  inivitationAccepted: 'inivitation-accepted',
  joinByInivitation: 'join-by-inivitation',
  joinByTask: 'join-by-task'
}

export const VOTE = {
  up: 'up',
  down: 'down'
}

export const PUBLISH_STATE = {
  archived: 'archived',
  pending: 'pending',
  error: 'error',
  published: 'published'
}

export const BCRYPT_ROUNDS = 12

export const BATCH_SIZE = 10

export const LOCAL_S3_ENDPOINT = 'http://localhost:4569'
