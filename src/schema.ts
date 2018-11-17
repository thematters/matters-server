// external
import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLNonNull
} from 'graphql'

// local
import { MutationType } from './mutations'
import { UserType } from './User'
import { ArticleType } from './Article'

// root query type
const QueryType = new GraphQLObjectType({
  name: 'Query',
  fields: {
    user: {
      type: UserType,
      description: 'User object with a given id',
      args: {
        id: {
          type: new GraphQLNonNull(GraphQLString)
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
          type: new GraphQLNonNull(GraphQLString)
        }
      },
      resolve: (root, { id }, { articleService }, info) =>
        articleService.loader.load(id)
    }
  }
})

export const schema = new GraphQLSchema({
  query: QueryType,
  mutation: MutationType
})
