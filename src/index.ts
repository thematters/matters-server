require('module-alias/register')

import { ApolloServer } from 'apollo-server'
import jwt from 'jsonwebtoken'
// local
import { environment } from 'common/environment'
import schema from './schema'
import { Context } from './definitions'
import {
  UserService,
  ArticleService,
  CommentService,
  DraftService
} from './connectors'

const userService = new UserService()

const context = async ({
  req,
  connection
}: {
  req: { headers: { 'x-access-token': string } }
  connection: any
}): Promise<Context> => {
  if (connection) {
    return connection.context
  }

  const token = req.headers['x-access-token']
  let viewer
  try {
    const decoded = jwt.verify(token, environment.jwtSecret) as { uuid: string }
    viewer = await userService.baseFindByUUID(decoded.uuid)
  } catch (err) {
    console.log('User is not logged in, viewing as guest')
  }
  return {
    viewer,
    userService,
    articleService: new ArticleService(),
    commentService: new CommentService(),
    draftService: new DraftService()
  }
}

const mocks = {
  JSON: () => ({
    'index.html': '<html><p>hello</p></html>',
    '1.png': 'some png string'
  }),
  DateTime: () => new Date().toISOString(),
  Email: () => 'test@matters.news',
  UUID: () => '00000000-0000-0000-0000-000000000001',
  URL: () => 'test-url'
}

const server = new ApolloServer({
  schema,
  context,
  engine: {
    apiKey: process.env['ENGINE_API_KEY']
  },
  subscriptions: {
    onConnect: async ({ accessToken }: { accessToken?: string }, webSocket) => {
      if (!accessToken) {
        throw new Error('Missing accessToken!')
      }

      try {
        const decoded = jwt.verify(accessToken, environment.jwtSecret) as {
          uuid: string
        }
        return {
          viewer: await userService.baseFindByUUID(decoded.uuid)
        }
      } catch (err) {
        console.log('User is not logged in, viewing as guest')
      }
    }
  }
  // mocks
})

server
  .listen({ port: process.env.PORT || 4000 })
  .then(({ url, subscriptionsUrl }) => {
    console.log(`🚀 Server ready at ${url}`)
    console.log(`🚀 Subscriptions ready at ${subscriptionsUrl}`)
  })
