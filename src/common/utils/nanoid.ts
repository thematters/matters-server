import { customAlphabet } from 'nanoid'

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'

export const nanoid = customAlphabet(ALPHABET, 12) // ~35 years or 308M IDs needed, in order to have a 1% probability of one collision // https://zelark.github.io/nano-id-cc/
