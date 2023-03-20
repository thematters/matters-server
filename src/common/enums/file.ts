export const IMAGE_ASSET_TYPE = {
  avatar: 'avatar',
  cover: 'cover',
  embed: 'embed',
  profileCover: 'profileCover',
  oauthClientAvatar: 'oauthClientAvatar',
  tagCover: 'tagCover',
  circleAvatar: 'circleAvatar',
  circleCover: 'circleCover',
  announcementCover: 'announcementCover',
  topicCover: 'topicCover',
  imgCached: 'img-cached',
}

export const AUDIO_ASSET_TYPE = {
  embedaudio: 'embedaudio',
}

export const ASSET_TYPE = {
  ...IMAGE_ASSET_TYPE,
  ...AUDIO_ASSET_TYPE,
}

export const ACCEPTED_UPLOAD_IMAGE_TYPES: string[] = [
  'image/gif',
  'image/png',
  'image/jpeg',
  'image/webp',
]

export const ACCEPTED_UPLOAD_AUDIO_TYPES: string[] = ['audio/mpeg', 'audio/aac']

export const ACCEPTED_UPLOAD_MIGRATION_TYPES: string[] = ['text/html']
