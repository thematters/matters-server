import { ForbiddenError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToResetWalletResolver } from 'definitions'

const resolver: MutationToResetWalletResolver = async (
  root,
  { input: { id } },
  { viewer, dataSources: { atomService, userService } }
) => {
  const { id: dbId } = fromGlobalId(id)
  const user = await userService.dataloader.load(dbId)

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
