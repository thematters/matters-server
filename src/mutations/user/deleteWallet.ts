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
    where: { id: walletId, userId: viewer.id },
  })

  if (!wallet) {
    throw new EntityNotFoundError('Wallet not found')
  }

  // delete wallet
  await atomService.deleteMany({
    table,
    where: { id: walletId },
  })

  return true
}

export default resolver
