import { OfficialToLinksResolver } from 'definitions'
import { isProd } from 'common/environment'

export const links: OfficialToLinksResolver = () => {
  return {
    beginnerGuide: isProd
      ? 'https://matters.news/guide'
      : 'https://web-stage.matters.news/guide',
    userGuide: isProd
      ? 'https://matters.news/guide'
      : 'https://web-stage.matters.news/guide',
    about: isProd
      ? 'https://matters.news/about'
      : 'https://web-stage.matters.news/about',
    faq: isProd
      ? 'https://matters.news/faq'
      : 'https://web-stage.matters.news/faq',
    tos: isProd
      ? 'https://matters.news/tos'
      : 'https://web-stage.matters.news/tos'
  }
}
