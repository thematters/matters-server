import _ from 'lodash'

import { LANGUAGE } from 'common/enums'

// map supported language to header language
export const langMap = {
  [LANGUAGE.zh_hant]: [LANGUAGE.zh_hant, 'zh-HK', 'zh'],
  [LANGUAGE.zh_hans]: [LANGUAGE.zh_hans, 'zh-CN'],
  [LANGUAGE.en]: [LANGUAGE.en, 'en-US']
}

const langList = _.keys(langMap)

const reverseList = _(langMap)
  .values()
  .map((list, i) => list.map(lang => ({ [lang]: langList[i] })))
  .flatten()
  // @ts-ignore
  .merge()
  .value()

export const reverseMap = _.assign.apply(_, reverseList)

export const supportList = _.keys(reverseMap)

export const getLanguage = (acceptLanguage: string) => {
  // parse quality values
  const requestList = acceptLanguage.split(',').map(lang => lang.split(';')[0])

  const supportIndex = requestList.findIndex(lang => supportList.includes(lang))

  if (supportIndex >= 0) {
    return reverseMap[requestList[supportIndex]]
  }

  return LANGUAGE.zh_hant
}
