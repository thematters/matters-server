import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ mentionedUserId }, _, { userService }) =>
  userService.idLoader.loadMany(mentionedUserId)

export default resolver
