import axios from 'axios'
import { recoverPersonalSignature } from 'eth-sig-util'
import { ethers } from 'ethers'
import { Knex } from 'knex'

import { environment, isProd } from 'common/environment.js'
import {
  EntityNotFoundError,
  EthAddressNotFoundError,
  UserInputError,
} from 'common/errors.js'
import { getProvider } from 'common/utils/index.js'
import { alchemy, AlchemyNetwork } from 'connectors/index.js'
import {
  GQLSigningMessagePurpose,
  MutationToClaimLogbooksResolver,
} from 'definitions'

const resolver: MutationToClaimLogbooksResolver = async (
  _,
  { input: { ethAddress, nonce, signature, signedMessage } },
  { viewer, dataSources: { atomService } }
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
          purpose: GQLSigningMessagePurpose.claimLogbook,
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
    ethers.BigNumber.from(item.id.tokenId).toString()
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
  let maxFeePerGas = ethers.BigNumber.from(40000000000) // 40 gwei
  let maxPriorityFeePerGas = ethers.BigNumber.from(40000000000) // 40 gwei
  try {
    const { data } = await axios({
      method: 'get',
      url: isProd
        ? 'https://gasstation-mainnet.matic.network/v2'
        : 'https://gasstation-mumbai.matic.today/v2',
    })
    maxFeePerGas = ethers.utils.parseUnits(
      Math.ceil(data.fast.maxFee) + '',
      'gwei'
    )
    maxPriorityFeePerGas = ethers.utils.parseUnits(
      Math.ceil(data.fast.maxPriorityFee) + '',
      'gwei'
    )
  } catch {
    // ignore
  }

  // send tx to claim tokens
  const iface = new ethers.utils.Interface(abi)
  const calldata = unclaimedTokenIds.map((tokenId) =>
    iface.encodeFunctionData('claim', [ethAddress, tokenId])
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
