import { UserInputError } from '#common/errors.js'
import dns from 'dns/promises'
import http from 'http'
import https from 'https'
import ipaddr from 'ipaddr.js'
import net from 'net'

const BLOCKED_IPV4_RANGES = new Set<string>([
  'unspecified', // 0.0.0.0/8
  'broadcast', // 255.255.255.255/32
  'multicast', // 224.0.0.0/4
  'linkLocal', // 169.254.0.0/16 incl. AWS/GCP/Azure metadata
  'loopback', // 127.0.0.0/8
  'carrierGradeNat', // 100.64.0.0/10 incl. AWS EKS pod range
  'private', // 10/8, 172.16/12, 192.168/16
  'reserved', // 240/4
])

const BLOCKED_IPV6_RANGES = new Set<string>([
  'unspecified', // ::/128
  'linkLocal', // fe80::/10
  'multicast', // ff00::/8
  'loopback', // ::1/128
  'uniqueLocal', // fc00::/7
  'rfc6052', // 64:ff9b::/96 NAT64 well-known prefix
])

// Allow only HTTP/HTTPS standard ports. URL parser strips default port (80 for
// http, 443 for https) to empty string, so empty also means "standard".
const ALLOWED_PORTS = new Set<string>(['', '80', '443'])

const isPrivateOrLoopback = (ip: string): boolean => {
  let parsed: ipaddr.IPv4 | ipaddr.IPv6
  try {
    parsed = ipaddr.parse(ip)
  } catch {
    return true
  }

  if (parsed.kind() === 'ipv4') {
    return BLOCKED_IPV4_RANGES.has((parsed as ipaddr.IPv4).range())
  }

  const ipv6 = parsed as ipaddr.IPv6
  // ::ffff:a.b.c.d — unwrap and check the embedded IPv4
  if (ipv6.isIPv4MappedAddress()) {
    try {
      return isPrivateOrLoopback(ipv6.toIPv4Address().toString())
    } catch {
      return true
    }
  }
  return BLOCKED_IPV6_RANGES.has(ipv6.range())
}

export interface ValidatedAddress {
  address: string
  family: 4 | 6
}

export const validateExternalUrl = async (
  rawUrl: string
): Promise<ValidatedAddress> => {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new UserInputError('invalid url')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new UserInputError('protocol not allowed')
  }
  if (!ALLOWED_PORTS.has(parsed.port)) {
    throw new UserInputError('port not allowed')
  }

  // WHATWG URL keeps [] around IPv6 literal; dns.lookup expects bare address
  const hostname = parsed.hostname.replace(/^\[/, '').replace(/\]$/, '')

  let addresses: Array<{ address: string; family: number }>
  try {
    addresses = await dns.lookup(hostname, { all: true })
  } catch {
    throw new UserInputError('invalid url')
  }
  if (addresses.length === 0) {
    throw new UserInputError('invalid url')
  }
  for (const { address } of addresses) {
    if (isPrivateOrLoopback(address)) {
      throw new UserInputError('host not allowed')
    }
  }
  const first = addresses[0]
  return {
    address: first.address,
    family: first.family === 6 ? 6 : 4,
  }
}

export const createPinnedAgents = (
  validated: ValidatedAddress
): { httpAgent: http.Agent; httpsAgent: https.Agent } => {
  const lookup: net.LookupFunction = (_hostname, _options, callback) => {
    callback(null, validated.address, validated.family)
  }
  return {
    httpAgent: new http.Agent({ lookup }),
    httpsAgent: new https.Agent({ lookup }),
  }
}
