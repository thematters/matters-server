import { environment } from 'common/environment'

export const QUEUE_URL = {
  archiveUser: environment?.awsArchiveUserQueueUrl,
  // likecoin
  likecoinLike: environment?.awsLikecoinLikeUrl,
  likecoinSendPV: environment?.awsLikecoinSendPVUrl,
  likecoinUpdateCivicLikerCache: environment?.awsLikecoinUpdateCivicLikerCache,

  // sendmail
  mail: environment?.awsMailQueueUrl,
  expressMail: environment?.awsExpressMailQueueUrl,
} as const
