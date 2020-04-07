import { OfficialToReleasesResolver } from 'definitions'

export const releases: OfficialToReleasesResolver = (
  _,
  { input: { platform, channel } }
) => {
  return [
    {
      title: 'title',
      description: 'description',
      cover: 'https://matters.news',
      link: 'https://matters.news',
      platform,
      channel,
      version: '1.0.0',
      latest: true,
      forceUpdate: true,
      releasedAt: new Date()
    }
  ]
}
