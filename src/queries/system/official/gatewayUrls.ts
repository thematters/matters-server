import axios from 'axios'

const TEST_HASH = 'Qmaisz6NMhDB51cCvNWa1GMS7LU1pAxdF4Ld6Ft9kZEP2a'
const PUBLIC_GATEWAYS: string[] = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://ipfs.infura.io/ipfs/',
  'https://rx14.co.uk/ipfs/',
  'https://xmine128.tk/ipfs/',
  'https://upload.global/ipfs/',
  'https://ipfs.jes.xxx/ipfs/',
  'https://catalunya.network/ipfs/',
  'https://siderus.io/ipfs/',
  'https://www.eternum.io/ipfs/',
  'https://hardbin.com/ipfs/',
  'https://ipfs.macholibre.org/ipfs/',
  'https://ipfs.works/ipfs/',
  'https://ipfs.work/ipfs/',
  'https://ipfs.wa.hle.rs/ipfs/',
  'https://api.wisdom.sh/ipfs/',
  'https://gateway.blocksec.com/ipfs/',
  'https://ipfs.renehsz.com/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://ipns.co/',
  'https://ipfs.netw0rk.io/ipfs/',
  'https://gateway.swedneck.xyz/ipfs/',
  'http://10.139.105.114:8080/ipfs/'
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
    const { status } = await axios.get(testUrl)
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
  const checkers = await Promise.all(
    PUBLIC_GATEWAYS.map(url =>
      checkGateway(TEST_HASH, url).then((alive: boolean) => ({ url, alive }))
    )
  )
  return checkers.filter(({ alive }) => alive).map(({ url }) => url)
}
