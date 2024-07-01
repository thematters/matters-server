import type { BasicAcceptedElems } from 'cheerio'

import * as cheerio from 'cheerio'

import { fromGlobalId } from './globalId'

export const extractMentionIds = (content: string): string[] => {
  const $ = cheerio.load(content)
  const mentionIds = $('a.mention')
    .map((index: number, node: BasicAcceptedElems<any>) => {
      const id = $(node).attr('data-id')
      if (id) {
        return id
      }
    })
    .get()
  return mentionIds.map((globalId) => {
    const { id } = fromGlobalId(globalId)
    return id
  })
}
