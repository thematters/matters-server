import { TagToIsFollowerResolver } from 'definitions'

const resolver: TagToIsFollowerResolver = async (
  { id },
  _,
  { viewer, dataSources: { tagService } }
) => {
  if (!viewer.id) {
    return false
  }

  return tagService.isFollower({
    targetId: id,
    userId: viewer.id,
  })
}

export default resolver
