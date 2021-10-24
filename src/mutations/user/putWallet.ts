import { recoverPersonalSignature } from 'eth-sig-util'
import Web3 from 'web3'

import { DB_NOTICE_TYPE } from 'common/enums'
import {
  AuthenticationError,
  CryptoWalletExistsError,
  EntityNotFoundError,
  UserInputError,
} from 'common/errors'
import {
  GQLCryptoWalletSignaturePurpose,
  MutationToPutWalletResolver,
  NoticeCryptoAirdropParams,
  NoticeCryptoConnectedParams,
} from 'definitions'

type BaseNoticeParams = Omit<
  NoticeCryptoAirdropParams | NoticeCryptoConnectedParams,
  'event'
>

const resolver: MutationToPutWalletResolver = async (
  _,
  { input: { id, address, purpose, signedMessage, signature } },
  { viewer, dataSources: { atomService, notificationService } }
) => {
  if (!viewer.id) {
    throw new AuthenticationError('visitor has no permission')
  }

  if (!address || !signedMessage || !signature) {
    throw new UserInputError('parameter is invaid')
  }

  if (!Web3.utils.isAddress(address)) {
    throw new UserInputError('address is invalid')
  }

  // verify signature
  const verifiedAddress = recoverPersonalSignature({
    data: signedMessage,
    sig: signature,
  })

  if (address.toLowerCase() !== verifiedAddress) {
    throw new UserInputError('signature is invalid')
  }

  let wallet
  const table = 'crypto_wallet'

  if (id) {
    // replace connected wallet
    const item = await atomService.findFirst({
      table,
      where: { id, userId: viewer.id },
    })

    if (!item) {
      throw new EntityNotFoundError('wallet not found')
    }

    wallet = await atomService.update({
      table,
      where: { id, userId: viewer.id },
      data: { address },
    })
  } else {
    // connect a wallet
    const [hasWallet, hasSameWallet] = await Promise.all([
      atomService.findFirst({
        table,
        where: { userId: viewer.id },
      }),
      atomService.findFirst({
        table,
        where: { address },
      }),
    ])

    if (hasWallet || hasSameWallet) {
      throw new CryptoWalletExistsError('wallet exists')
    }

    wallet = await atomService.create({
      table,
      data: { userId: viewer.id, address },
    })
  }

  // store signature for confirmation
  await atomService.create({
    table: 'crypto_wallet_signature',
    data: { address, signedMessage, signature, purpose },
  })

  // send notice and email to inform user
  const noticeData: BaseNoticeParams = {
    recipientId: viewer.id,
    entities: [
      {
        type: 'target',
        entityTable: 'crypto_wallet',
        entity: wallet,
      },
    ],
  }

  const emailData = {
    cryptoWallet: { address: wallet.address },
    language: viewer.language,
    recipient: {
      displayName: viewer.displayName,
    },
    to: viewer.email,
  }

  switch (purpose) {
    case GQLCryptoWalletSignaturePurpose.airdrop: {
      notificationService.trigger({
        ...noticeData,
        event: DB_NOTICE_TYPE.crypto_wallet_airdrop,
      })
      notificationService.mail.sendCryptoWalletAirdrop(emailData)
      break
    }
    case GQLCryptoWalletSignaturePurpose.connect: {
      notificationService.trigger({
        ...noticeData,
        event: DB_NOTICE_TYPE.crypto_wallet_connected,
      })
      notificationService.mail.sendCryptoWalletConnected(emailData)
      break
    }
  }

  return wallet
}

export default resolver
