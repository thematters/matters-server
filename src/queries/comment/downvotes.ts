import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { dataSources: { commentService } }) =>
  commentService.countDownVote(id)

export default resolver
