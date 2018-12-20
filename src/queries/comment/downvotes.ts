import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { commentService }) =>
  commentService.countDownVote(id)

export default resolver
