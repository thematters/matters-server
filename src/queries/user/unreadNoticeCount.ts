import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { userService }) =>
  userService.countUnreadNotice(id)

export default resolver
