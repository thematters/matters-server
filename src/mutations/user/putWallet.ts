import { recoverPersonalSignature } from 'eth-sig-util'
import Web3 from 'web3'

import { DB_NOTICE_TYPE } from 'common/enums'
import { environment } from 'common/environment'
import {
  AuthenticationError,
  CryptoWalletExistsError,
  EntityNotFoundError,
  ForbiddenError,
  ServerError,
  UserInputError,
} from 'common/errors'
import { fromGlobalId } from 'common/utils'
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

  if (!environment.nftAirdropStart || !environment.nftAirdropEnd) {
    throw new ServerError('airdrop start or end time is invalid')
  }

  // check time limit
  const now = Date.now()
  const start = new Date(environment.nftAirdropStart).getTime()
  const end = new Date(environment.nftAirdropEnd).getTime()
  const connectStart = new Date(environment.nftConnectStart).getTime()

  if (purpose === GQLCryptoWalletSignaturePurpose.airdrop) {
    if (now < start || now >= end) {
      throw new ForbiddenError('blocked by time limit')
    }
  } else {
    if (now < connectStart) {
      throw new ForbiddenError('blocked by time limit')
    }
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

  // check address is using or not
  const sameWallet = await atomService.findFirst({
    table,
    where: { address, archived: false },
  })

  if (sameWallet) {
    throw new CryptoWalletExistsError('wallet exists')
  }

  if (id) {
    const { id: dbId } = fromGlobalId(id)

    // replace connected wallet
    const viewerWallet = await atomService.findFirst({
      table,
      where: { id: dbId, userId: viewer.id, archived: false },
    })

    if (!viewerWallet) {
      throw new EntityNotFoundError('wallet not found')
    }

    wallet = await atomService.update({
      table,
      where: { id: dbId, userId: viewer.id },
      data: { address, updatedAt: new Date() },
    })
  } else {
    // create a new wallet
    const viewerWallet = await atomService.findFirst({
      table,
      where: { userId: viewer.id, archived: false },
    })

    if (viewerWallet) {
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
    data: { userId: viewer.id, address, signedMessage, signature, purpose },
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
