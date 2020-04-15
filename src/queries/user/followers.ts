import {
  connectionFromArray,
  connectionFromArrayWithKeys,
  cursorToKeys,
} from 'common/utils'
import { UserToFollowersResolver } from 'definitions'

const resolver: UserToFollowersResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const keys = cursorToKeys(input.after)
  const params = { targetId: id, after: keys.idCursor, limit: input.first }
  const [count, items] = await Promise.all([
    userService.countFollowers(id),
    userService.findFollowers(params),
  ])
  const cursors = items.reduce(
    (map, item) => ({ ...map, [item.userId]: item.id }),
    {}
  )
  const users = (await userService.dataloader.loadMany(
    items.map(({ userId }: { userId: string }) => userId)
  )) as Array<Record<string, any>>
  const data = users.map((user) => ({ ...user, __cursor: cursors[user.id] }))

  return connectionFromArrayWithKeys(data, input, count)
}

export default resolver
