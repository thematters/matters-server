// external
import { createTestClient } from 'apollo-server-testing'
import { ApolloServer } from 'apollo-server'
// local
import { DataSources } from 'definitions'
import {
  ArticleService,
  CommentService,
  DraftService,
  SystemService,
  TagService,
  UserService
} from 'connectors'
import { initSubscriptions } from 'common/utils'
import schema from '../../schema'

export const defaultTestUser = {
  email: 'test1@matters.news',
  password: '123'
}

export const getUserContext = async ({ email }: { email: string }) => {
  const userService = new UserService()
  const user = await userService.findByEmail(email)
  return {
    viewer: user
  }
}

export const defaultContext = {
  viewer: undefined
}

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const testClient = async (
  { isAuth, context }: { isAuth?: boolean; context?: any } = {
    isAuth: false,
    context: {}
  }
) => {
  let _context
  if (context) {
    _context = context
  } else if (isAuth) {
    _context = await getUserContext({ email: defaultTestUser.email })
  } else {
    _context = defaultContext
  }

  const server = new ApolloServer({
    schema,
    context: _context,
    subscriptions: initSubscriptions(),
    dataSources: (): DataSources => ({
      userService: new UserService(),
      articleService: new ArticleService(),
      commentService: new CommentService(),
      draftService: new DraftService(),
      systemService: new SystemService(),
      tagService: new TagService()
    })
  })

  return createTestClient(server)
}
