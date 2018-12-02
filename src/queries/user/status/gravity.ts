import { Resolver } from 'src/definitions'

const resolver: Resolver = async ({ currGravity }, _) => {
  return currGravity
}

export default resolver
