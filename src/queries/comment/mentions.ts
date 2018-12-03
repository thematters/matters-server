import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ mentionUUIDs }, _, { userService }) =>
  userService.loader.loadMany(mentionUUIDs)

export default resolver
