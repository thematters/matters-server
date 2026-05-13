import { jest } from '@jest/globals'

import { UserInputError } from '#common/errors.js'

jest.unstable_mockModule('dns/promises', () => ({
  default: {
    lookup: jest.fn(),
  },
}))

const dns = (await import('dns/promises')).default as unknown as {
  lookup: jest.Mock
}
const { validateExternalUrl, createPinnedAgents } = await import(
  '#common/utils/validateExternalUrl.js'
)

const mockLookup = (addresses: string[]) => {
  dns.lookup.mockImplementation(async () =>
    addresses.map((address) => ({
      address,
      family: address.includes(':') ? 6 : 4,
    }))
  )
}

describe('validateExternalUrl', () => {
  beforeEach(() => {
    dns.lookup.mockReset()
  })

  describe('invalid input', () => {
    it('rejects malformed URL', async () => {
      await expect(validateExternalUrl('not a url')).rejects.toThrow(
        UserInputError
      )
    })

    it('rejects empty string', async () => {
      await expect(validateExternalUrl('')).rejects.toThrow(UserInputError)
    })
  })

  describe('port restriction', () => {
    it.each([
      ['Redis', 'http://example.com:6379/'],
      ['SSH', 'http://example.com:22/'],
      ['common dev port 8080', 'http://example.com:8080/'],
      ['common dev port 3000', 'https://example.com:3000/'],
      ['Elasticsearch', 'http://example.com:9200/'],
      ['Memcached', 'http://example.com:11211/'],
    ])('rejects non-standard port (%s)', async (_label, url) => {
      await expect(validateExternalUrl(url)).rejects.toThrow(
        new UserInputError('port not allowed')
      )
    })

    it('accepts default http (no port)', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })

    it('accepts default https (no port)', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('https://example.com/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })

    it('accepts http://x:80 (default stripped by URL parser)', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('http://example.com:80/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })

    it('accepts https://x:443 (default stripped by URL parser)', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('https://example.com:443/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })

    it('accepts explicit non-default port 443 on http', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('http://example.com:443/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })
  })

  describe('protocol restriction', () => {
    it.each([
      'file:///etc/passwd',
      'ftp://example.com/x',
      'gopher://example.com',
      'javascript:alert(1)',
      'data:text/plain,hello',
    ])('rejects %s', async (url) => {
      await expect(validateExternalUrl(url)).rejects.toThrow(
        new UserInputError('protocol not allowed')
      )
    })

    it('accepts http://', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })

    it('accepts https://', async () => {
      mockLookup(['1.2.3.4'])
      await expect(
        validateExternalUrl('https://example.com/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })
  })

  describe('IPv4 blocking', () => {
    it.each([
      ['loopback 127.0.0.1', '127.0.0.1'],
      ['loopback 127.5.5.5', '127.5.5.5'],
      ['RFC 1918 10.x', '10.0.0.1'],
      ['CGNAT 100.64.x', '100.64.0.1'],
      ['CGNAT 100.127.x', '100.127.255.255'],
      ['RFC 1918 172.16.x', '172.16.0.1'],
      ['RFC 1918 172.31.x', '172.31.255.255'],
      ['RFC 1918 192.168.x', '192.168.1.1'],
      ['link-local 169.254.x', '169.254.1.1'],
      ['AWS metadata', '169.254.169.254'],
      ['reserved 0.0.0.0', '0.0.0.0'],
      ['multicast 224.x', '224.0.0.1'],
    ])('rejects %s', async (_label, address) => {
      mockLookup([address])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).rejects.toThrow(new UserInputError('host not allowed'))
    })

    it('accepts public IPv4', async () => {
      mockLookup(['1.1.1.1'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '1.1.1.1', family: 4 })
    })

    it('accepts 172.15.x (outside RFC 1918)', async () => {
      mockLookup(['172.15.0.1'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '172.15.0.1', family: 4 })
    })

    it('accepts 172.32.x (outside RFC 1918)', async () => {
      mockLookup(['172.32.0.1'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '172.32.0.1', family: 4 })
    })

    it('accepts 100.63.x (just below CGNAT)', async () => {
      mockLookup(['100.63.255.255'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '100.63.255.255', family: 4 })
    })

    it('accepts 100.128.x (just above CGNAT)', async () => {
      mockLookup(['100.128.0.0'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '100.128.0.0', family: 4 })
    })
  })

  describe('IPv6 blocking', () => {
    it.each([
      ['unspecified ::', '::'],
      ['loopback ::1', '::1'],
      ['unique local fc00', 'fc00::1'],
      ['unique local fd00', 'fd00::1'],
      ['link-local fe80', 'fe80::1'],
      ['multicast ff00', 'ff00::1'],
      ['NAT64 64:ff9b::', '64:ff9b::1.2.3.4'],
      ['NAT64 64:ff9b:: loopback', '64:ff9b::7f00:1'],
      ['IPv4-mapped loopback', '::ffff:127.0.0.1'],
      ['IPv4-mapped RFC 1918', '::ffff:10.0.0.1'],
      ['IPv4-mapped metadata', '::ffff:169.254.169.254'],
    ])('rejects %s', async (_label, address) => {
      mockLookup([address])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).rejects.toThrow(new UserInputError('host not allowed'))
    })

    it('accepts public IPv6', async () => {
      mockLookup(['2606:4700:4700::1111'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '2606:4700:4700::1111', family: 6 })
    })

    it('rejects IPv6 literal hostname http://[::1]/', async () => {
      mockLookup(['::1'])
      await expect(validateExternalUrl('http://[::1]/')).rejects.toThrow(
        new UserInputError('host not allowed')
      )
    })
  })

  describe('IPv6 alternate representations', () => {
    it.each([
      ['fully expanded loopback', '0:0:0:0:0:0:0:1'],
      ['fully expanded with leading zeros', '0000:0000:0000:0000:0000:0000:0000:0001'],
      ['mixed compression', '0:0:0:0::1'],
      ['upper case fe80', 'FE80::1'],
      ['upper case fc00', 'FC00::1'],
      ['upper case unspecified', '0:0:0:0:0:0:0:0'],
    ])('rejects %s', async (_label, address) => {
      mockLookup([address])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).rejects.toThrow(new UserInputError('host not allowed'))
    })
  })

  describe('multi-record DNS', () => {
    it('rejects if any returned address is private', async () => {
      mockLookup(['1.2.3.4', '10.0.0.1'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).rejects.toThrow(new UserInputError('host not allowed'))
    })

    it('accepts and returns first address when all public', async () => {
      mockLookup(['1.2.3.4', '8.8.8.8'])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).resolves.toEqual({ address: '1.2.3.4', family: 4 })
    })

    it('rejects when DNS returns no addresses', async () => {
      mockLookup([])
      await expect(
        validateExternalUrl('http://example.com/x.png')
      ).rejects.toThrow(new UserInputError('invalid url'))
    })
  })

  describe('DNS failure', () => {
    it('rejects when DNS lookup throws', async () => {
      dns.lookup.mockImplementation(async () => {
        throw new Error('ENOTFOUND')
      })
      await expect(
        validateExternalUrl('http://nonexistent.example/x.png')
      ).rejects.toThrow(new UserInputError('invalid url'))
    })
  })
})

type LookupFn = (
  hostname: string,
  options: unknown,
  callback: (err: Error | null, address: string, family: number) => void
) => void

interface AgentWithOptions {
  options: { lookup?: LookupFn }
}

const extractLookup = (agent: unknown): LookupFn => {
  const lookup = (agent as AgentWithOptions).options?.lookup
  if (!lookup) {
    throw new Error('lookup not set on agent')
  }
  return lookup
}

const callLookup = (agent: unknown) =>
  new Promise<{ address: string; family: number }>((resolve, reject) => {
    const lookup = extractLookup(agent)
    lookup('any.attacker-controlled.example', {}, (err, address, family) => {
      if (err) {
        reject(err)
        return
      }
      resolve({ address, family })
    })
  })

describe('createPinnedAgents', () => {
  it('returns http and https agents whose lookup is pinned', async () => {
    const validated = { address: '1.2.3.4', family: 4 as const }
    const { httpAgent, httpsAgent } = createPinnedAgents(validated)

    await expect(callLookup(httpAgent)).resolves.toEqual({
      address: '1.2.3.4',
      family: 4,
    })
    await expect(callLookup(httpsAgent)).resolves.toEqual({
      address: '1.2.3.4',
      family: 4,
    })
  })

  it('pins IPv6 family correctly', async () => {
    const validated = { address: '2606:4700:4700::1111', family: 6 as const }
    const { httpAgent } = createPinnedAgents(validated)
    await expect(callLookup(httpAgent)).resolves.toEqual({
      address: '2606:4700:4700::1111',
      family: 6,
    })
  })
})
