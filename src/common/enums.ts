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

export const PUBLISH_STATE = {
  draft: 'draft',
  pending: 'pending',
  recalled: 'recalled',
  archived: 'archived',
  error: 'error',
  published: 'published',
  banned: 'banned'
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
