import xss from 'xss'

const CUSTOM_WHITE_LISTS = {
  figure: [],
  figcaption: [],
  iframe: ['src']
}

export const sanitize = (string: string) =>
  xss(string, { whiteList: { ...xss.whiteList, ...CUSTOM_WHITE_LISTS } })
