import type { GQLMutationResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['resetLikerId'] = async (
  _,
  { input: { id } },
  { dataSources: { atomService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const user = await atomService.userIdLoader.load(dbId)

  if (!user || !user.likerId) {
    throw new ForbiddenError("user doesn't exist or have a liker id")
  }

  await atomService.deleteMany({
    table: 'user_oauth_likecoin',
    where: { likerId: user.likerId },
  })

  const updatedUser = await atomService.update({
    table: 'user',
    where: { id: user.id },
    data: { updatedAt: new Date(), likerId: null },
  })

  return updatedUser
}

export default resolver
