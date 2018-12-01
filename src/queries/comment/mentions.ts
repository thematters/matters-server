import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ mentionIds }, _, { userService }) =>
  userService.loader.loadMany(mentionIds)

export default resolver
