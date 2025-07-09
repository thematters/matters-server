import { environment } from '#common/environment.js'

export const QUEUE_URL = {
  archiveUser: environment?.awsArchiveUserQueueUrl,

  // notification
  notification: environment?.awsNotificationQueueUrl,

  // likecoin
  likecoinLike: environment?.awsLikecoinLikeUrl,
  likecoinSendPV: environment?.awsLikecoinSendPVUrl,
  likecoinUpdateCivicLikerCache: environment?.awsLikecoinUpdateCivicLikerCache,

  // sendmail
  mail: environment?.awsMailQueueUrl,
  expressMail: environment?.awsExpressMailQueueUrl,

  // ipfs
  ipfsPublication: environment?.awsIpfsPublicationQueueUrl,

  // blockchain payment
  blockchainPayment: environment?.awsBlockchainPaymentQueueUrl,

  // search index
  searchIndexUser: environment?.awsSearchIndexUserQueueUrl,
  searchIndexTag: environment?.awsSearchIndexTagQueueUrl,
  searchIndexArticle: environment?.awsSearchIndexArticleQueueUrl,
} as const
