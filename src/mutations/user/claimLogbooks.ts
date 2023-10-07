import type { GQLMutationResolvers } from 'definitions'

import axios from 'axios'
import { recoverPersonalSignature } from 'eth-sig-util'
import { Knex } from 'knex'
import { Address, createWalletClient, encodeFunctionData, getContract, http, parseUnits } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { SIGNING_MESSAGE_PURPOSE } from 'common/enums'
import { environment, isProd } from 'common/environment'
import {
  EntityNotFoundError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors'
import { getClient } from 'common/utils'
import { alchemy, AlchemyNetwork } from 'connectors'

const resolver: GQLMutationResolvers['claimLogbooks'] = async (
  _,
  { input: { ethAddress, nonce, signature, signedMessage } },
  { dataSources: { atomService } }
) => {
  // verify signature
  const sig_table = 'crypto_wallet_signature'

  const lastSigning = await atomService.findFirst({
    table: sig_table,
    where: (builder: Knex.QueryBuilder) =>
      builder
        .where({
          address: ethAddress,
          nonce,
          purpose: SIGNING_MESSAGE_PURPOSE.claimLogbook,
        })
        .whereNull('signature')
        .whereRaw('expired_at > CURRENT_TIMESTAMP'),
  })

  if (!lastSigning) {
    throw new EthAddressNotFoundError(
      `wallet signing for "${ethAddress}" not found`
    )
  }

  const verifiedAddress = recoverPersonalSignature({
    data: signedMessage,
    sig: signature,
  }).toLowerCase()

  if (ethAddress.toLowerCase() !== verifiedAddress) {
    throw new UserInputError('signature is not valid')
  }

  // get Traveloggers token ids
  const traveloggersNFTs = (await alchemy.getNFTs({
    network: isProd ? AlchemyNetwork.Mainnet : AlchemyNetwork.Rinkeby,
    contract: environment.traveloggersContractAddress,
    owner: ethAddress,
  })) as { ownedNfts: Array<{ id: { tokenId: string } }> }
  const tokenIds = traveloggersNFTs.ownedNfts.map((item) =>
    BigInt(item.id.tokenId).toString()
  )

  if (tokenIds.length <= 0) {
    throw new EntityNotFoundError('no logbooks to claim')
  }

  // filter unclaimed token ids
  const client = getClient()
  const abi = [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function claim(address to_, uint256 logrsId_)',
    'function multicall(bytes[] data) returns (bytes[] results)',
  ]
  const walletClient = createWalletClient({
    account: privateKeyToAccount(environment.logbookClaimerPrivateKey as Address),
    chain: client.chain,
    transport: http()
  })
  const contract = getContract({
    publicClient: client,
    abi,
    address: environment.logbookContractAddress as Address,
    walletClient
  })

  const unclaimedTokenIds = []
  for (const tokenId of tokenIds) {
    try {
      await contract.read.ownerOf([tokenId])
    } catch (e) {
      unclaimedTokenIds.push(tokenId)
    }
  }

  if (unclaimedTokenIds.length <= 0) {
    throw new EntityNotFoundError('no logbooks to claim')
  }

  // get max gas from gas station
  let maxFeePerGas = BigInt(40000000000) // 40 gwei
  let maxPriorityFeePerGas = BigInt(40000000000) // 40 gwei
  try {
    const { data } = await axios({
      method: 'get',
      url: isProd
        ? 'https://gasstation-mainnet.matic.network/v2'
        : 'https://gasstation-mumbai.matic.today/v2',
    })
    maxFeePerGas = parseUnits(
      Math.ceil(data.fast.maxFee) + '',
      9, // 'gwei'
    )
    maxPriorityFeePerGas = parseUnits(
      Math.ceil(data.fast.maxPriorityFee) + '',
      9, // 'gwei'
    )
  } catch {
    // ignore
  }

  // send tx to claim tokens
  const calldata = unclaimedTokenIds.map((tokenId) =>
    encodeFunctionData({
      abi,
      functionName: 'claim',
      args: [ethAddress, tokenId]
    })
  )

  const txHash = await contract.write.multicall(calldata, {
    maxFeePerGas,
    maxPriorityFeePerGas,
  })

  // update crypto_wallet_signature record
  await atomService.update({
    table: sig_table,
    where: { id: lastSigning.id },
    data: {
      signature,
      updatedAt: new Date(),
    },
  })

  return {
    ids: unclaimedTokenIds,
    txHash,
  }
}

export default resolver
