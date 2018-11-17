require('module-alias/register')
// external
import { ApolloServer } from 'apollo-server'

// internal
import { schema } from './schema'
import { UserService, ActionService } from './User'
import { ArticleService } from './Article'
import { CommentService } from './Comment'

const context = () => ({
  userService: new UserService(),
  articleService: new ArticleService(),
  commentService: new CommentService(),
  actionService: new ActionService()
})

const server = new ApolloServer({
  schema,
  context,
  engine: {
    apiKey: process.env['ENGINE_API_KEY']
  },
  introspection: true // allow introspection for now, disable before release
})

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
