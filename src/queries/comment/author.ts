import { Resolver } from 'definitions'

const resolver: Resolver = ({ authorId }, _, { userService }) =>
  userService.dataloader.load(authorId)

export default resolver
