import type { GQLMutationResolvers } from 'definitions'

import axios from 'axios'
import { recoverPersonalSignature } from 'eth-sig-util'
import { ethers } from 'ethers'
import { Knex } from 'knex'
import { encodeFunctionData, parseUnits } from 'viem'

import { SIGNING_MESSAGE_PURPOSE } from 'common/enums'
import { environment, isProd } from 'common/environment'
import {
  EntityNotFoundError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors'
import { getProvider } from 'common/utils'
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
  const provider = getProvider()
  const abi = [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function claim(address to_, uint256 logrsId_)',
    'function multicall(bytes[] data) returns (bytes[] results)',
  ]
  const signer = new ethers.Wallet(
    environment.logbookClaimerPrivateKey,
    provider
  )
  const contract = new ethers.Contract(
    environment.logbookContractAddress,
    abi,
    signer
  )

  const unclaimedTokenIds = []
  for (const tokenId of tokenIds) {
    try {
      await contract.ownerOf(tokenId)
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

  const tx = await contract.multicall(calldata, {
    maxFeePerGas,
    maxPriorityFeePerGas,
  })
  const receipt = (await tx.wait()) as ethers.providers.TransactionReceipt
  const txHash = receipt.transactionHash

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
