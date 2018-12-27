// @ts-ignore
import { JPushAsync, JPush } from 'jpush-async'

import { environment } from 'common/environment'
import { BaseService } from '../baseService'

class PushService extends BaseService {
  client: any

  constructor() {
    super('push_device')
    this.client = JPushAsync.buildClient(
      environment.jpushKey,
      environment.jpushSecret
    )
  }

  async push({
    title,
    text,
    userIds,
    topic,
    broadcast,
    platform
  }: {
    title?: string
    text: string
    userIds: [string]
    topic?: any
    broadcast?: boolean
    platform?: 'ios' | 'android'
  }) {
    let _push = this.client.push()

    // platform
    _push = _push.setPlatform(platform || JPush.ALL)

    // audience
    if (broadcast) {
      _push = _push.setAudience(JPush.ALL)
    } else if (topic) {
      _push = _push.setAudience(JPush.tags(topic))
    } else {
      const deviceIds = await this.findPushDevicesByUserIds(userIds)
      _push = _push.setAudience(JPush.registration_id(deviceIds))
    }

    // TODO: extras
    const extras = {}

    // notification
    _push = _push.setNotification(
      JPush.android(text, title, null, extras),
      JPush.ios(text, 'default', '+1', null, extras)
    )

    // send
    _push.send()
  }

  /**
   * Find a push device by a given user id
   */
  findPushDeviceByUserId(userId: string) {
    return this.knex
      .select()
      .where({ userId })
      .first()
  }

  /**
   * Find push devices by given user ids
   */
  findPushDevicesByUserIds(userIds: [string]) {
    return this.knex
      .select()
      .whereIn('userId', userIds)
      .first()
  }
}

export default PushService
