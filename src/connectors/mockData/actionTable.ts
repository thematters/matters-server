import { randomRepeatIds } from './utils'
import { USER_ACTION, VOTE } from '../../common/enums'

export const createTestActions = (testSize: {
  article: number
  user: number
  comment: number
  action: number
}) => {
  const createAppreicationActions = (size: number) => {
    const articleIds = randomRepeatIds(size, testSize.article)
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: USER_ACTION.appreciate,
      detail: 1, // MAT number
      targetId: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createFollowActions = (size: number) => {
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: USER_ACTION.follow,
      detail: null,
      targetId: randomRepeatIds(size, testSize.user, userIds[i])[0],
      timestamp: new Date().toISOString()
    }))
  }

  const createSubscribeArticleAction = (size: number) => {
    const articleIds = randomRepeatIds(size, testSize.article)
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: USER_ACTION.subscribeArticle,
      detail: null,
      targetId: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  // const createRateCourseAction = () => {}

  const createRateUSER_ACTION = (size: number) => {
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: USER_ACTION.rateUser,
      detail: 4,
      targetId: randomRepeatIds(size, testSize.user, userIds[i])[0],
      timestamp: new Date().toISOString()
    }))
  }

  const createVoteCommentAction = (size: number) => {
    const commentIds = randomRepeatIds(size, testSize.comment)
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: USER_ACTION.vote,
      detail: [VOTE.up, VOTE.down][Math.round(Math.random())],
      targetId: commentIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createFinishAction = (size: number) => {
    const articleIds = randomRepeatIds(size, testSize.article)
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: USER_ACTION.finish,
      detail: null,
      targetId: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }
  const test = [
    createAppreicationActions,
    createFollowActions,
    createSubscribeArticleAction,
    createRateUSER_ACTION,
    createVoteCommentAction,
    createFinishAction
  ].reduce((total: any[], func) => [...total, ...func(testSize.action)], [])
  return test.map((item, i) => ({ id: String(i), ...item }))
}
