// external
import { ApolloServer } from 'apollo-server'

// internal
import { environment } from './common/environment'
import { schema } from './schema'
import { UserService } from './User'
import { ArticleService } from './Article'
import { CommentService } from './Comment'

const context = () => ({
  userService: new UserService(),
  articleService: new ArticleService(),
  commentService: new CommentService()
})

const server = new ApolloServer({
  schema,
  context,
  engine: {
    apiKey: environment.engineApiKey
  },
  introspection: true // allow introspection for now, disable before release
})

server.listen({ port: process.env.PORT || 4000 }).then(({ url }) => {
  console.log(`🚀  Server ready at ${url}`)
})
