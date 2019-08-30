import { responsePathAsArray } from 'graphql'

export const makeFieldPath = (data: any) =>
  (responsePathAsArray(data)).join('.')
