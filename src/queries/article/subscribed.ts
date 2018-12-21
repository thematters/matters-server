import { Resolver } from 'definitions'

const resolver: Resolver = ({ id }, _, { viewer, articleService }) => {
  if (!viewer) {
    return false
  }

  return articleService.isSubscribed({
    userId: viewer.id,
    targetId: id
  })
}

export default resolver
