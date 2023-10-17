export const IMAGE_ASSET_TYPE = {
  avatar: 'avatar',
  cover: 'cover',
  embed: 'embed',
  profileCover: 'profileCover',
  oauthClientAvatar: 'oauthClientAvatar',
  tagCover: 'tagCover',
  circleAvatar: 'circleAvatar',
  circleCover: 'circleCover',
  collectionCover: 'collectionCover',
  announcementCover: 'announcementCover',
  topicCover: 'topicCover',
} as const

export const AUDIO_ASSET_TYPE = {
  embedaudio: 'embedaudio',
} as const

export const ASSET_TYPE = {
  ...IMAGE_ASSET_TYPE,
  ...AUDIO_ASSET_TYPE,
} as const

export const ACCEPTED_UPLOAD_IMAGE_TYPES = [
  'image/gif',
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export const ACCEPTED_UPLOAD_AUDIO_TYPES = ['audio/mpeg', 'audio/aac'] as const

export const ACCEPTED_UPLOAD_MIGRATION_TYPES = ['text/html'] as const
