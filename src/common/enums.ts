export const MATERIALIZED_VIEW = {
  articleCountMaterialized: 'article_count_materialized',
  tagCountMaterialized: 'tag_count_materialized',
  userReaderMaterialized: 'user_reader_materialized',
  articleActivityMaterialized: 'article_activity_materialized'
}

export const USER_ROLE = {
  admin: 'admin',
  user: 'user',
  visitor: 'visitor'
}

export const LANGUAGE = {
  zh_hans: 'zh_hans',
  zh_hant: 'zh_hant',
  en: 'en'
}

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
  appreciateComment: 'appreciate-comment',
  appreciateSubsidy: 'appreciate-subsidy',
  invitationAccepted: 'invitation-accepted',
  joinByInvitation: 'join-by-invitation',
  joinByTask: 'join-by-task',
  firstPost: 'first-post',
  systemSubsidy: 'system-subsidy'
}

export const VOTE = {
  up: 'up',
  down: 'down'
}

export const COMMENT_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned'
}

export const USER_STATE = {
  inactive: 'inactive',
  onboarding: 'onboarding',
  active: 'active',
  banned: 'banned',
  frozen: 'frozen',
  archived: 'archived'
}

export const ARTICLE_STATE = {
  active: 'active',
  archived: 'archived',
  banned: 'banned'
}

export const PUBLISH_STATE = {
  unpublished: 'unpublished',
  pending: 'pending',
  error: 'error',
  published: 'published'
}

export const INVITATION_STATUS = {
  pending: 'pending',
  activated: 'activated'
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

export const VERIFICATION_CODE_EXIPRED_AFTER = 1000 * 60 * 5 // 5 mins
export const VERIFICATION_CODE_STATUS = {
  active: 'active',
  inactive: 'inactive',
  verified: 'verified',
  expired: 'expired',
  used: 'used'
}
export const VERIFICATION_CODE_TYPES = {
  register: 'register',
  email_reset: 'email_reset',
  password_reset: 'password_reset',
  email_verify: 'email_verify'
}

export const VERIFICATION_CODE_PROTECTED_TYPES = ['email_reset', 'email_verify']

export const REPORT_CATEGORIES = [
  {
    id: '1',
    name: '侵權、抄襲'
  },
  {
    id: '2',
    name: '攻擊、侮辱、誹謗、恐嚇他人'
  },
  {
    id: '3',
    name: '鼓吹歧視、仇恨'
  },
  {
    id: '4',
    name: '誤導、欺詐、侵犯隱私'
  },
  {
    id: '5',
    name: '色情、暴力、教唆犯罪或鼓勵自我傷害'
  },
  {
    id: '6',
    name: '假新聞、不實消息、垃圾訊息'
  },
  {
    id: '7',
    name: '冒用他人身份'
  },
  {
    id: '8',
    name: '其他（請填寫原因）'
  }
]

export const FEEDBACK_CATEGORIES = [
  {
    id: '1',
    name: '操作異常'
  },
  {
    id: '2',
    name: '功能建議'
  },
  {
    id: '3',
    name: '其他'
  }
]

/**
 * Queue
 */
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
  publishPendingDrafts: 'publishPendingDrafts',
  initializeSearch: 'initializeSearch',
  refreshView: 'refreshView'
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

export const EMAIL_TEMPLATE_ID = {
  verificationCode: 'd-df196f90da7743f6900906fc18487953',
  registerSuccess: 'd-765b335a77d244438891a62f023b8c2e',
  invitationSuccess: 'd-daaa0da594034f509cfa01e5ecdb1f77'
}

export const INVALID_NAMES = [
  'administrator',
  'administrators',
  'admin',
  'admins',
  'team',
  'teams',
  'matters',
  'member',
  'members',
  'user',
  'users',
  'matty',
  'matties',
  '團隊',
  '团队',
  '管理員',
  '管理员',
  'mattersadmin',
  'matters團隊',
  'matters团队',
  'matters管理員',
  'matters管理员'
]
