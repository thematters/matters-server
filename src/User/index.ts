// external
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql'

// local
import { ArticleType } from '../Article'

const UserNameType = new GraphQLObjectType({
  name: 'UserName',
  description: 'Name of this user',
  fields: () => ({
    displayName: {
      type: new GraphQLNonNull(GraphQLString)
    },
    userName: { type: new GraphQLNonNull(GraphQLString) }
  })
})

export const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  description: 'User object',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    name: { type: UserNameType },
    description: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'Self description of this user'
    },
    email: { type: new GraphQLNonNull(GraphQLString) },
    rating: { type: GraphQLInt },
    // drafts
    // courses
    articles: {
      type: new GraphQLList(ArticleType),
      description: 'Articles written by this user',
      resolve: ({ id }, _, { articleService }) =>
        articleService.findByAuthor(id)
    },
    // comments(first: Number, after: Number): [Comments] // 用戶的評論
    // subscriptions
    // history
    // dialogues
    // hasFollowed
    // settings
    followers: {
      type: new GraphQLList(UserType),
      description: 'Followers of this user',
      resolve: ({ followerIds }, _, { userService }) =>
        userService.loader.loadMany(followerIds)
    },
    follows: {
      type: new GraphQLList(UserType),
      description: 'Users that this user follows',
      resolve: ({ followIds }, _, { userService }) =>
        userService.loader.loadMany(followIds)
    }
  })
})

export { UserService } from './userService'
