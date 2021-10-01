import * as xss from 'xss'

const CUSTOM_WHITELIST = {
  source: ['src', 'type'],
  iframe: ['src', 'frameborder', 'allowfullscreen', 'sandbox'],
}

const IFRAME_SANDBOX_WHITELIST = [
  'allow-scripts',
  'allow-same-origin',
  'allow-popups',
  'allow-popups-to-escape-sandbox',
  'allow-storage-access-by-user-activation',
  'allow-top-navigation-by-user-activation',
]

const IFRAME_DOMAIN_WHITELIST = [
  'jsfiddle.net',
  'button.like.co',
  'www.youtube.com',
  'player.vimeo.com',
  'player.youku.com',
]

const onTagAttr = (
  tag: string,
  name: string,
  value: string,
  isWhiteAttr: boolean
) => {
  if (!isWhiteAttr) {
    return
  }

  // iframe:sandbox
  if (name === 'sandbox') {
    const attrs = value
      .split(' ')
      .map((a) => a.trim().toLocaleLowerCase())
      .filter((a) => IFRAME_SANDBOX_WHITELIST.includes(a))
    const newVal = attrs.join(' ')
    return `${name}="${newVal}"`
  }

  // iframe:src
  if (tag === 'iframe' && name === 'src') {
    try {
      const url = new URL(value)
      const domain = url?.hostname

      if (!IFRAME_DOMAIN_WHITELIST.includes(domain)) {
        return ''
      }
    } catch (error) {
      console.error(error)
      return ''
    }
  }

  // src
  if (name === 'src') {
    const newVal = value.replace(/\s/g, '')
    return `${name}="${newVal}"`
  }
}

const onIgnoreTagAttr = (tag: string, name: string, value: string) => {
  /**
   * Allow attributes of whitelist tags start with "data-" or "class"
   *
   * @see https://github.com/leizongmin/js-xss#allow-attributes-of-whitelist-tags-start-with-data-
   */
  if (name.substr(0, 5) === 'data-' || name.substr(0, 5) === 'class') {
    // escape its value using built-in escapeAttrValue function
    return name + '="' + xss.escapeAttrValue(value) + '"'
  }
}

const onIgnoreTag = (
  tag: string,
  html: string,
  options: { [key: string]: any }
) => {
  if (tag === 'input' || tag === 'textarea') {
    return ''
  }
}

const xssOptions = {
  whiteList: { ...xss.whiteList, ...CUSTOM_WHITELIST },
  onTagAttr,
  onIgnoreTagAttr,
  onIgnoreTag,
}
const customXSS = new xss.FilterXSS(xssOptions)

export const sanitize = (string: string) => customXSS.process(string)
