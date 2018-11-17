// TODO: move mutations to seperate object type directories

import { GraphQLObjectType, GraphQLString } from 'graphql'

// local
import { ArticleType } from './Article'

export const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    achiveArticle: {
      type: ArticleType,
      args: {
        id: {
          type: GraphQLString,
          description: 'Id of article to achive'
        }
      },
      resolve: (root, { id }, { articleService }) =>
        articleService.updateById(id, { publishState: 'archived' })
    }
    // publishArticle: {
    //   type: ArticleType,
    //   args: {
    //     id: {
    //       type: GraphQLString,
    //       description: 'Id of article to achive'
    //     }
    //   },
    //   resolve: (root, { id }, { articleService }) =>
    //     articleService.publishArticle(id, { publishState: 'archived' })
    // }
  }
})
