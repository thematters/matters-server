import type { GQLTagResolvers } from 'definitions'

import {
  connectionFromArray,
  connectionFromArrayWithKeys,
  cursorToKeys,
  fromConnectionArgs,
} from 'common/utils'

const resolver: GQLTagResolvers['followers'] = async (
  { id },
  { input },
  { dataSources: { tagService, userService } }
) => {
  if (!id) {
    return connectionFromArray([], input)
  }

  const { take } = fromConnectionArgs(input)
  const keys = cursorToKeys(input.after)
  const params = { targetId: id, skip: keys.idCursor, take }
  const [count, actions] = await Promise.all([
    tagService.countFollowers(id),
    tagService.findFollowers(params),
  ])
  const cursors = actions.reduce(
    (map, action) => ({ ...map, [action.userId]: action.id }),
    {}
  )

  const users = (await userService.loadByIds(
    actions.map(({ userId }: { userId: string }) => userId)
  )) as Array<Record<string, any>>
  const data = users.map((user) => ({ ...user, __cursor: cursors[user.id] }))

  return connectionFromArrayWithKeys(data, input, count)
}

export default resolver
