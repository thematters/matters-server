import { BaseService } from 'src/connectors/baseService'
import DataLoader from 'dataloader'

export class UserNotifySettingService extends BaseService {
  constructor() {
    super('user_notify_setting')
    this.fields = [
      'id',
      'user_id as userId',
      'enable',
      'mention',
      'follow',
      'comment',
      'appreciation',
      'article_subscription as articleSubscription',
      'comment_subscribed as commentSubscribed',
      'downstream',
      'comment_pinned as commentPinned',
      'comment_voted as commentVoted',
      'wallet_update as walletUpdate',
      'official_notice as officialNotice',
      'report_feedback as reportFeedback',
      'created_at as createdAt',
      'updated_at as updatedAt'
    ]
  }

  /**
   * Find an user by a given user id.
   */
  findByUserId = async (userId: number): Promise<any[]> => {
    return await this.knex
      .select(this.fields)
      .from(this.table)
      .where('user_id', userId)
  }

  findyUserIds = async (userIds: number[]): Promise<any[]> => {
    return await this.knex
      .select(this.fields)
      .from(this.table)
      .whereIn('user_id', userIds)
  }
}
