import { MemoryBlockstore } from 'blockstore-core/memory'
import { importer } from 'ipfs-unixfs-importer'

// @see {@url https://docs.pinata.cloud/web3/pinning/pinning-files#predetermining-the-cid}
export const predictCID = async (file: File, version: 0 | 1 = 1) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const blockstore = new MemoryBlockstore()

    let rootCid: any

    for await (const result of importer([{ content: buffer }], blockstore, {
      cidVersion: version,
      // hashAlg: 'sha2-256',
      rawLeaves: version === 1,
    })) {
      rootCid = result.cid
    }

    return rootCid.toString()
  } catch (err) {
    return err
  }
}
