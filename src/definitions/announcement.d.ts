export interface Announcement {
  id: string
  title: string
  cover: string | null
  content: string | null
  link: string | null
  type: 'community' | 'product' | 'seminar'
  visible: boolean
  order: number
  createdAt: Date
  updatedAt: Date
  expiredAt: Date | null
}

export interface AnnouncementTranslation {
  id: string
  announcementId: string
  language: string
  title: string
  cover: string | null
  content: string | null
  link: string | null
  createdAt: Date
  updatedAt: Date
}
