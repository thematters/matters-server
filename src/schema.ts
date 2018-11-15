// external
import { GraphQLObjectType, GraphQLSchema, GraphQLString } from 'graphql'

// local
import { UserType } from './User'
import { ArticleType } from './Article'
import { CommentType } from './Comment'

export const schema = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    fields: {
      user: {
        type: UserType,
        description: 'User object with a given id',
        args: {
          id: {
            type: GraphQLString
          }
        },
        resolve: (root, { id }, { userService }, info) =>
          userService.loader.load(id)
      },
      article: {
        type: ArticleType,
        description: 'Article object with a given id',
        args: {
          id: {
            type: GraphQLString
          }
        },
        resolve: (root, { id }, { articleService }, info) =>
          articleService.loader.load(id)
      }
    }
  })
})
