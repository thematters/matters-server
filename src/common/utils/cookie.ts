import { Response } from 'express'
import { environment } from 'common/environment'

export const setCookie = ({
  res,
  token,
  expiresIn
}: {
  res: Response
  token: string
  expiresIn: number
}) => {
  if (environment.env === 'test') {
    // skip during testing
    return
  }

  return res.cookie('token', token, { maxAge: expiresIn, httpOnly: true })
}
