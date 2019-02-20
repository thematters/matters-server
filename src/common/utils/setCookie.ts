import { Response } from 'express'

export const setCookie = ({
  res,
  token,
  expiresIn
}: {
  res: Response
  token: string
  expiresIn: number
}) => res.cookie('token', token, { maxAge: expiresIn, httpOnly: true })
