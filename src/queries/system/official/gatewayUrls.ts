import axios from 'axios'
import pMap from 'p-map'

const TEST_HASH = 'Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a'
const PUBLIC_GATEWAYS: string[] = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://ipfs.infura.io/ipfs/',
  'https://ipfs.wa.hle.rs/ipfs/',
  'https://gateway.swedneck.xyz/ipfs/',
  'https://hardbin.com/ipfs/',
  'https://ipfs.jes.xxx/ipfs/',
  'https://ipfs.renehsz.com/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/'
]

const __CACHE_CHECKED_GATEWAYS: { [key in string]: boolean } = {}

// check accessbility for a given hash and gateway
const checkGateway = async (
  hash: string,
  gatewayUrl: string
): Promise<boolean> => {
  if (__CACHE_CHECKED_GATEWAYS[gatewayUrl]) {
    return true
  }

  const testUrl = `${gatewayUrl}${hash}#x-ipfs-companion-no-redirect`
  try {
    const { status } = await axios.get(testUrl, {
      timeout: 2000
    })
    if (status === 200) {
      __CACHE_CHECKED_GATEWAYS[gatewayUrl] = true
      return true
    }
    return false
  } catch (err) {
    return false
  }
}

export const gatewayUrls = async () => {
  const checkers = await pMap(PUBLIC_GATEWAYS, url =>
    checkGateway(TEST_HASH, url).then((alive: boolean) => ({ url, alive }))
  )
  return checkers.filter(({ alive }) => alive).map(({ url }) => url)
}
