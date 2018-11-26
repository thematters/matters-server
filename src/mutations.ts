// // TODO: move mutations to seperate object type directories
// import {
//   GraphQLObjectType,
//   GraphQLString,
//   GraphQLInputObjectType,
//   GraphQLNonNull,
//   GraphQLList
// } from 'graphql'

// // local
// import { ArticleType } from './Article'

// const ArticleInputType: GraphQLInputObjectType = new GraphQLInputObjectType({
//   name: 'ArticleInput',
//   fields: () => ({
//     upstreamId: { type: GraphQLString, description: 'Id of upstream article' },
//     title: {
//       type: new GraphQLNonNull(GraphQLString),
//       description: 'Title of article'
//     },
//     draftId: { type: GraphQLString, description: 'Id of draft' },
//     tags: { type: new GraphQLList(GraphQLString) },
//     cover: { type: GraphQLString }
//     // content:  // define json type with 'index.html'
//   })
// })

// export const MutationType = new GraphQLObjectType({
//   name: 'Mutation',
//   fields: {
//     achiveArticle: {
//       type: ArticleType,
//       args: {
//         id: {
//           type: GraphQLString,
//           description: 'Id of article to achive'
//         }
//       },
//       resolve: (root, { id }, { articleService }) =>
//         articleService.updateById(id, { publishState: 'archived' })
//     }
//     // publishArticle: {
//     //   type: ArticleType,
//     //   args: {
//     //     article: {
//     //       type: ArticleInputType,
//     //       description: 'Article object to publish'
//     //     }
//     //   },
//     //   resolve: (root, { article }, { articleService }) =>
//     //     articleService.publish(article)
//     // }
//   }
// })
