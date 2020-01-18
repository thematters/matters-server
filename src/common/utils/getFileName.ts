export const getFileName = (disposition: string, url: string) => {
  if (disposition) {
    const match = disposition.match(/filename="(.*)"/) || []
    if (match.length >= 2) {
      return decodeURI(match[1])
    }
  }

  if (url) {
    const fragment = url.split('/').pop()
    if (fragment) {
      return fragment.split('?')[0]
    }
  }
}
