import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.countUpVote(id)

export default resolver
