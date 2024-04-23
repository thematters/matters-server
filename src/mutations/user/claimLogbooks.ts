import type { GQLMutationResolvers } from 'definitions'

import axios from 'axios'
import { Knex } from 'knex'
import {
  Address,
  Hex,
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  getContract,
  http,
  parseGwei,
  recoverMessageAddress,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { polygon } from 'viem/chains'

import { BLOCKCHAIN_RPC, SIGNING_MESSAGE_PURPOSE } from 'common/enums'
import { environment, isProd, contract } from 'common/environment'
import {
  EntityNotFoundError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors'
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

  const verifiedAddress = (
    await recoverMessageAddress({
      message: signedMessage as Hex,
      signature: signature as Hex,
    })
  ).toLowerCase()

  if (ethAddress.toLowerCase() !== verifiedAddress) {
    throw new UserInputError('signature is not valid')
  }

  // get Traveloggers token ids
  const traveloggersNFTs = (await alchemy.getNFTs({
    network: isProd ? AlchemyNetwork.Mainnet : AlchemyNetwork.Rinkeby,
    contract: contract.Ethereum.traveloggersAddress,
    owner: ethAddress,
  })) as { ownedNfts: Array<{ id: { tokenId: string } }> }
  const tokenIds = traveloggersNFTs.ownedNfts.map((item) =>
    BigInt(item.id.tokenId).toString()
  )

  if (tokenIds.length <= 0) {
    throw new EntityNotFoundError('no logbooks to claim')
  }

  // FIXME: pause support for the Polygon testnet
  // @see {src/common/enums/payment.ts:L59}
  if (!isProd) {
    throw new UserInputError('Polygon Mumbai is deprecated')
  }

  // filter unclaimed token ids
  const client = createPublicClient({
    chain: polygon,
    transport: http(BLOCKCHAIN_RPC[polygon.id]),
  })
  const abi = [
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function claim(address to_, uint256 logrsId_)',
    'function multicall(bytes[] data) returns (bytes[] results)',
  ]
  const walletClient = createWalletClient({
    account: privateKeyToAccount(
      environment.logbookClaimerPrivateKey as Address
    ),
    chain: client.chain,
    transport: http(),
  })
  const logbookContract = getContract({
    publicClient: client,
    abi,
    address: contract.Polygon.logbookAddress as Address,
    walletClient,
  })

  const unclaimedTokenIds = []
  for (const tokenId of tokenIds) {
    try {
      await logbookContract.read.ownerOf([tokenId])
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
      url: 'https://gasstation-mainnet.matic.network/v2',
    })
    maxFeePerGas = parseGwei(Math.ceil(data.fast.maxFee) + '')
    maxPriorityFeePerGas = parseGwei(Math.ceil(data.fast.maxPriorityFee) + '')
  } catch {
    // ignore
  }

  // send tx to claim tokens
  const calldata = unclaimedTokenIds.map((tokenId) =>
    encodeFunctionData({
      abi,
      functionName: 'claim',
      args: [ethAddress, tokenId],
    })
  )

  const txHash = await logbookContract.write.multicall(calldata, {
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
