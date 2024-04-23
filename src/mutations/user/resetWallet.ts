import type { GQLMutationResolvers } from 'definitions'

import { ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'

const resolver: GQLMutationResolvers['resetWallet'] = async (
  _,
  { input: { id } },
  { dataSources: { atomService, userService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const user = await atomService.userIdLoader.load(dbId)

  if (!user || !user.ethAddress) {
    throw new ForbiddenError("user doesn't exist or have a crypto wallet")
  }

  if (!user.passwordHash) {
    throw new ForbiddenError(
      'user registered with crypto wallet is not allowed'
    )
  }

  const updatedUser = await atomService.update({
    table: 'user',
    where: { id: user.id },
    data: { updatedAt: new Date(), ethAddress: null },
  })

  return updatedUser
}

export default resolver
