import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ authorId }, _, { userService }) => false

export default resolver
