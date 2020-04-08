import { OfficialToPlacementsResolver } from 'definitions'

export const placements: OfficialToPlacementsResolver = () => {
  return {
    webAsideTop: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news',
      adLabel: false,
    },
    appSplash: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news',
      adLabel: true,
    },
    appInStreamTop: {
      image: 'https://via.placeholder.com/640x1280',
      link: 'https://matters.news',
      adLabel: false,
    },
    appInStreamMiddle: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news',
      adLabel: false,
    },
    appInStreamBottom: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news',
      adLabel: false,
    },
    appInvitationTop: {
      image: 'https://via.placeholder.com/640x320',
      link: 'https://matters.news',
      adLabel: false,
    },
  }
}
