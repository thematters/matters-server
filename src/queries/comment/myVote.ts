import { Resolver } from 'src/definitions'

const resolver: Resolver = ({ mentionIds }, _, { userService }) => 'up'

export default resolver
