import { Passphrases } from 'connectors'

test('Passphrases validation', () => {
  const passphrases = new Passphrases()

  // empty string
  expect(passphrases.isValidPassphrases('')).toBe(false)

  // wrong chunks
  expect(passphrases.isValidPassphrases('123-123')).toBe(false)

  // wrong length
  expect(passphrases.isValidPassphrases('123-123-123-123-123-123')).toBe(false)

  // wrong characters
  expect(
    passphrases.isValidPassphrases('12356-12356-12356-12356-12356-12356')
  ).toBe(false)
  expect(
    passphrases.isValidPassphrases('loenT-Loent-loEnt-lOent-loeNt-loent')
  ).toBe(false)
  expect(
    passphrases.isValidPassphrases('loen我-Loen們-lon.t-lO+nt-loe?t-`oent')
  ).toBe(false)

  // valid with hyphens
  expect(
    passphrases.isValidPassphrases('loent-loent-loent-loent-loent-loent')
  ).toBe(true)

  // valid w/o hyphens
  expect(passphrases.isValidPassphrases('loentloentloentloentloentloent')).toBe(
    true
  )

  // valid with spaces
  expect(
    passphrases.isValidPassphrases(' loent loent loent loent loent loent ')
  ).toBe(true)

  // valid with vaiants of hyphens
  expect(
    passphrases.isValidPassphrases('loent־loent᠆loent‐loent‑loent‒loent')
  ).toBe(true)
  expect(
    passphrases.isValidPassphrases('loent—loent―loent⁻loent−loent－loent')
  ).toBe(true)
})
