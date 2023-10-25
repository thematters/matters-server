import axios from 'axios'
import { ServerError } from 'oauth2-server'

import { environment } from 'common/environment'
import {
  CodeExpiredError,
  PasswordInvalidError,
  UnknownError,
} from 'common/errors'

const TAKE = 6
const WORD_CHAR_LENGTH = 5

export class Passphrases {
  public generate = async ({
    payload,
    expiresInMinutes,
  }: {
    payload: { [key: string]: string | number }
    expiresInMinutes: number
  }): Promise<string[]> => {
    const url = `${environment.passphrasesApiUrl}/api/generate`

    try {
      const result = await axios({
        method: 'post',
        url,
        data: {
          sigPayload: payload,
          sigSecret: environment.passphrasesSecret,
          expiresInMinutes,
          take: TAKE,
        },
      })
      return result.data.passphrases
    } catch (error: any) {
      const code = error.response.data?.code
      if (code === 'InputError') {
        throw new ServerError('invalid input')
      }

      throw new UnknownError('unknown error')
    }
  }

  public verify = async ({
    payload,
    passphrases,
  }: {
    payload: { [key: string]: string | number }
    passphrases: string[]
  }): Promise<boolean> => {
    const url = `${environment.passphrasesApiUrl}/api/verify`

    try {
      const result = await axios({
        method: 'post',
        url,
        data: {
          sigPayload: payload,
          sigSecret: environment.passphrasesSecret,
          passphrases,
          take: TAKE,
        },
      })
      return result.status === 200
    } catch (error: any) {
      const code = error.response.data?.code
      if (code === 'PassphrasesExpiredError') {
        throw new CodeExpiredError('passphrases expired')
      }
      if (code === 'PassphrasesMismatchError') {
        throw new PasswordInvalidError('passphrases mismatch')
      }

      throw new UnknownError('unknown error')
    }
  }

  public normalize = (pass: string): string[] => {
    if (!pass) return []

    // remove all spaces and hyphens
    // https://jkorpela.fi/dashes.html
    pass = pass.replace(/[\s-־᠆‐‑‒–—―⁻−－﹣]/g, '')

    // remove all non-alphabet characters
    pass = pass.replace(/[^a-z]/g, '')

    // split into array of words
    return pass.match(new RegExp(`.{1,${WORD_CHAR_LENGTH}}`, 'g')) || []
  }

  public isValidPassphrases = (pass: string): boolean => {
    const passphrases = this.normalize(pass)

    if (passphrases.join('').length !== TAKE * WORD_CHAR_LENGTH) {
      return false
    }

    return true
  }
}
