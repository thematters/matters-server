require('module-alias/register')
import { ApolloServer } from 'apollo-server'
import jwt from 'jsonwebtoken'
// local
import { environment } from 'src/common/environment'
import schema from './schema'
import { Context } from './definitions'
import { UserService, ArticleService, CommentService } from './connectors'

const context = async ({
  req
}: {
  req: { headers: { 'x-access-token': string } }
}): Promise<Context> => {
  const userService = new UserService()
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
    commentService: new CommentService()
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
  }
  // mocks
})

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
