import type { GlobalId } from '#definitions/nominal.js'
import type { BasicAcceptedElems } from 'cheerio'

import * as cheerio from 'cheerio'

import { fromGlobalId } from './globalId.js'

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
    const { id } = fromGlobalId(globalId as GlobalId)
    return id
  })
}

export const stripMentions = (content: string): string => {
  const $ = cheerio.load(content, null, false)
  $('a.mention').remove()
  return $.html()
}
