import { Resolver } from 'definitions'

const resolver: Resolver = async ({ id }, _, { commentService }) =>
  commentService.countByAuthor(id)

export default resolver
