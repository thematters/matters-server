import { randomRepeatIds } from './utils'
import { enums } from 'src/common'

const { userActions, votes } = enums

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
      action: userActions.appreciate,
      detail: 1, // MAT number
      targetId: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createFollowActions = (size: number) => {
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.follow,
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
      action: userActions.subscribeArticle,
      detail: null,
      targetId: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  // const createRateCourseAction = () => {}

  const createRateUserActions = (size: number) => {
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.rateUser,
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
      action: userActions.vote,
      detail: [votes.up, votes.down][Math.round(Math.random())],
      targetId: commentIds[i],
      timestamp: new Date().toISOString()
    }))
  }

  const createFinishAction = (size: number) => {
    const articleIds = randomRepeatIds(size, testSize.article)
    const userIds = randomRepeatIds(size, testSize.user)
    return [...Array(size).keys()].map(i => ({
      userId: userIds[i],
      action: userActions.finish,
      detail: null,
      targetId: articleIds[i],
      timestamp: new Date().toISOString()
    }))
  }
  const test = [
    createAppreicationActions,
    createFollowActions,
    createSubscribeArticleAction,
    createRateUserActions,
    createVoteCommentAction,
    createFinishAction
  ].reduce(
    (total: Array<any>, func) => [...total, ...func(testSize.action)],
    []
  )
  return test.map((item, i) => ({ id: String(i), ...item }))
}
