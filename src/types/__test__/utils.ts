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
  UserService,
  NotificationService
} from 'connectors'
import { initSubscriptions } from 'common/utils'
import schema from '../../schema'

export const defaultTestUser = {
  email: 'test1@matters.news',
  password: '123'
}
export const adminUser = {
  email: 'admin1@matters.news',
  password: '123'
}

export const getUserContext = async ({ email }: { email: string }) => {
  const userService = new UserService()
  const user = await userService.findByEmail(email)
  return {
    viewer: user
  }
}

export const delay = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms))

export const testClient = async (
  {
    isAuth,
    isAdmin,
    context
  }: { isAuth?: boolean; isAdmin?: boolean; context?: any } = {
    isAuth: false,
    isAdmin: false,
    context: null
  }
) => {
  let _context: any
  if (context) {
    _context = { viewer: { id: null }, ...context }
  } else if (isAuth) {
    _context = await getUserContext({
      email: isAdmin ? adminUser.email : defaultTestUser.email
    })
  } else {
    _context = { viewer: { id: null } }
  }

  const server = new ApolloServer({
    schema,
    context: () => _context,
    dataSources: (): DataSources => ({
      userService: new UserService(),
      articleService: new ArticleService(),
      commentService: new CommentService(),
      draftService: new DraftService(),
      systemService: new SystemService(),
      tagService: new TagService(),
      notificationService: new NotificationService()
    })
  })

  return createTestClient(server)
}
