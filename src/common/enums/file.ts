export const COVER_ASSET_TYPE = {
  cover: 'cover',
  profileCover: 'profileCover',
  tagCover: 'tagCover',
  circleCover: 'circleCover',
  collectionCover: 'collectionCover',
  announcementCover: 'announcementCover',
} as const

export const AVATAR_ASSET_TYPE = {
  avatar: 'avatar',
  oauthClientAvatar: 'oauthClientAvatar',
  circleAvatar: 'circleAvatar',
} as const

export const IMAGE_ASSET_TYPE = {
  embed: 'embed',
  moment: 'moment',
  ...COVER_ASSET_TYPE,
  ...AVATAR_ASSET_TYPE,
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

export const ACCEPTED_COVER_UPLOAD_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
] as const

export const ACCEPTED_UPLOAD_AUDIO_TYPES = ['audio/mpeg', 'audio/aac'] as const

export const ACCEPTED_UPLOAD_MIGRATION_TYPES = ['text/html'] as const
