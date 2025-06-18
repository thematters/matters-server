export type UserRetentionStateToMail = 'NEWUSER' | 'ACTIVE'
export type UserRetentionStateToMark = 'NORMAL' | 'ALERT' | 'INACTIVE'
export type UserRetentionState =
  | UserRetentionStateToMail
  | UserRetentionStateToMark
