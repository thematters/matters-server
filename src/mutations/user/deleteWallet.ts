import { AuthenticationError, EntityNotFoundError } from 'common/errors'
import { fromGlobalId } from 'common/utils'
import { MutationToDeleteWalletResolver } from 'definitions'

const resolver: MutationToDeleteWalletResolver = async (
  _,
  { input: { id } },
  { viewer, dataSources: { atomService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  const { id: walletId } = fromGlobalId(id)

  const table = 'crypto_wallet'

  // check if exist
  const wallet = await atomService.findFirst({
    table,
    where: { id: walletId, userId: viewer.id, archived: false },
  })

  if (!wallet) {
    throw new EntityNotFoundError('Wallet not found')
  }

  // archive wallet
  await atomService.update({
    table,
    where: { id: walletId, userId: viewer.id },
    data: { archived: true },
  })

  return true
}

export default resolver
