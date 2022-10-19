import CID from 'cids'

export const tryConvertVersionOfCID = (cidLike: string): string | null => {
  try {
    const parsed = new CID(cidLike)
    if (parsed.version === 0) {
      return parsed.toV1().toString()
    } else if (parsed.version === 1) {
      return parsed.toV0().toString()
    } else {
      return null
    }
  } catch (error) {
    return null
  }
}
