import { VERIFICATION_CODE_STATUS, VERIFICATION_CODE_TYPE } from 'common/enums'

export interface VerificationCode {
  id: string
  uuid: string
  expiredAt: Date | null
  verifiedAt: Date | null
  usedAt: Date | null
  code: string
  type: keyof typeof VERIFICATION_CODE_TYPE
  status: VERIFICATION_CODE_STATUS
  userId: stiring | null
  email: string
  createdAt: Date
  updatedAt: Date
}
