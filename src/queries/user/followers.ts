import {
  connectionFromArray,
  connectionFromArrayWithKeys,
  cursorToKeys,
  fromConnectionArgs,
} from 'common/utils/index.js'
import { UserToFollowersResolver } from 'definitions'

const resolver: UserToFollowersResolver = async (
  { id },
  { input },
  { dataSources: { userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take } = fromConnectionArgs(input)
  const keys = cursorToKeys(input.after)

  const [count, actions] = await Promise.all([
    userService.countFollowers(id),
    userService.findFollowers({ targetId: id, skip: keys.idCursor, take }),
  ])
  const cursors = actions.reduce(
    (map, action) => ({ ...map, [action.userId]: action.id }),
    {}
  )
  const users = (await userService.dataloader.loadMany(
    actions.map(({ userId }: { userId: string }) => userId)
  )) as Array<Record<string, any>>
  const data = users.map((user) => ({ ...user, __cursor: cursors[user.id] }))

  return connectionFromArrayWithKeys(data, input, count)
}

export default resolver
