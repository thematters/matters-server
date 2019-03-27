import xss from 'xss'

const CUSTOM_WHITE_LISTS = {
  a: [
    ...(xss.whiteList.a || []),
    'class',
    'data-id',
    'data-user-name',
    'data-display-name'
  ],
  figure: [],
  figcaption: [],
  iframe: ['src', 'class']
}

export const sanitize = (string: string) =>
  xss(string, { whiteList: { ...xss.whiteList, ...CUSTOM_WHITE_LISTS } })
