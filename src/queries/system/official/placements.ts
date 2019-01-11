import { OfficialToPlacementsResolver } from 'definitions'

export const placements: OfficialToPlacementsResolver = () => {
  return {
    webAsideTop: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news'
    },
    appSplash: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news',
      adLabel: true
    },
    appInStreamTop: {
      image: 'https://via.placeholder.com/640x1280',
      link: 'https://matters.news'
    },
    appInStreamMiddle: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news'
    },
    appInStreamBottom: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news'
    },
    appInvitationTop: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news'
    }
  }
}
