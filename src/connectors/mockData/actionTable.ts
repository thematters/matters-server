import { randomIds } from './utils'
import { userActions, votes } from '../../common/enums'

export const createTestActions = (testSize: {
  article: number
  user: number
  comment: number
  action: number
}) => {
  const createAppreicationActions = (size: number) => {
    const articleIds = randomIds(size, testSize.article)
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.appreciate,
      detail: 1, // MAT number
      target: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createFollowActions = (size: number) => {
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.follow,
      detail: null,
      target: randomIds(size, testSize.user, userIds[i])[0],
      timestamp: new Date().toISOString()
    }))
  }

  const createSubscribeArticleAction = (size: number) => {
    const articleIds = randomIds(size, testSize.article)
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.subscribeArticle,
      detail: null,
      target: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createSubscribeCommentAction = (size: number) => {
    const commentIds = randomIds(size, testSize.comment)
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.subscribeComment,
      detail: null,
      target: commentIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  // const createRateCourseAction = () => {}

  const createRateUserActions = (size: number) => {
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.rateUser,
      detail: 4,
      target: randomIds(size, testSize.user, userIds[i])[0],
      timestamp: new Date().toISOString()
    }))
  }

  const createVoteCommentAction = (size: number) => {
    const commentIds = randomIds(size, testSize.comment)
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.vote,
      detail: [votes.up, votes.down][Math.round(Math.random())],
      target: commentIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createFinishAction = (size: number) => {
    const articleIds = randomIds(size, testSize.article)
    const userIds = randomIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.finish,
      detail: null,
      target: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  return [
    createAppreicationActions,
    createFollowActions,
    createSubscribeArticleAction,
    createSubscribeCommentAction,
    createRateUserActions,
    createVoteCommentAction,
    createFinishAction
  ]
    .reduce(
      (total: Array<any>, func) => [...total, ...func(testSize.action)],
      []
    )
    .map((item, i) => ({ id: String(i), ...item }))
}
