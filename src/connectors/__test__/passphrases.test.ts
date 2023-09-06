import { Passphrases } from 'connectors'

test('Passphrases validation', () => {
  const passphrases = new Passphrases()

  // empty string
  expect(passphrases.isValidpassphrases('')).toBe(false)

  // wrong chunks
  expect(passphrases.isValidpassphrases('123-123')).toBe(false)

  // wrong length
  expect(passphrases.isValidpassphrases('123-123-123-123-123-123')).toBe(false)

  // wrong characters
  expect(
    passphrases.isValidpassphrases('12356-12356-12356-12356-12356-12356')
  ).toBe(false)
  expect(
    passphrases.isValidpassphrases('loenT-Loent-loEnt-lOent-loeNt-loent')
  ).toBe(false)
  expect(
    passphrases.isValidpassphrases('loen我-Loen們-lon.t-lO+nt-loe?t-`oent')
  ).toBe(false)

  // valid with hyphens
  expect(
    passphrases.isValidpassphrases('loent-loent-loent-loent-loent-loent')
  ).toBe(true)

  // valid w/o hyphens
  expect(passphrases.isValidpassphrases('loentloentloentloentloentloent')).toBe(
    true
  )

  // valid with spaces
  expect(
    passphrases.isValidpassphrases(' loent loent loent loent loent loent ')
  ).toBe(true)

  // valid with vaiants of hyphens
  expect(
    passphrases.isValidpassphrases('loent־loent᠆loent‐loent‑loent‒loent')
  ).toBe(true)
  expect(
    passphrases.isValidpassphrases('loent—loent―loent⁻loent−loent－loent')
  ).toBe(true)
})
