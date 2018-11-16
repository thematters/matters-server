// external
import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql'

// local
import { userActions } from '../common/enums'
import { ArticleType } from '../Article'
import { CommentType } from '../Comment'

export const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  description: 'User object',
  fields: () => ({
    id: { type: new GraphQLNonNull(GraphQLString) },
    displayName: {
      type: new GraphQLNonNull(GraphQLString)
    },
    userName: { type: new GraphQLNonNull(GraphQLString) },
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
    comments: {
      type: new GraphQLList(CommentType),
      description: 'Comments posted by this user',
      resolve: ({ id }, _, { commentService }) =>
        commentService.findByAuthor(id)
    }, //(first: Number, after: Number): [Comments] // 用戶的評論
    // subscriptions
    // history
    // dialogues
    // hasFollowed
    // settings
    followers: {
      type: new GraphQLList(UserType),
      description: 'Followers of this user',
      resolve: async ({ id }, _, { actionService, userService }) => {
        const followActions = await actionService.findActionByTarget(
          userActions.follow,
          id
        )
        return userService.loader.loadMany(
          followActions.map(({ userId }: { userId: string }) => userId)
        )
      }
    },
    follows: {
      type: new GraphQLList(UserType),
      description: 'Users that this user follows',
      resolve: async ({ id }, _, { actionService, userService }) => {
        const followActions = await actionService.findActionByUser(
          userActions.follow,
          id
        )
        return userService.loader.loadMany(
          followActions.map(({ targetId }: { targetId: string }) => targetId)
        )
      }
    }
  })
})

export { UserService } from './userService'
export { ActionService } from './actionService'
