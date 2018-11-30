require('module-alias/register')
import { ApolloServer } from 'apollo-server'

import schema from './schema'
import { Context } from './definitions'
import { UserService, ActionService } from './User'
import { ArticleService } from './Article'
import { CommentService } from './Comment'

const context = (): Context => ({
  userService: new UserService(),
  articleService: new ArticleService(),
  commentService: new CommentService(),
  actionService: new ActionService()
})

const mocks = {
  JSON: () => ({
    'index.html': '<html><p>hello</p></html>',
    '1.png': 'some png string'
  }),
  DateTime: () => new Date().toISOString()
}

const server = new ApolloServer({
  schema,
  context,
  engine: {
    apiKey: process.env['ENGINE_API_KEY']
  },
  mocks
})

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
