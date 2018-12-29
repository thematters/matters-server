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
    if (environment.env === 'test') {
      return
    }

    let _push = this.client.push()

    // platform
    _push = _push.setPlatform(platform || JPush.ALL)

    // audience
    if (broadcast) {
      _push = _push.setAudience(JPush.ALL)
    } else if (topic) {
      _push = _push.setAudience(JPush.tags(topic))
    } else {
      const users = await this.baseFindByIds(userIds, 'user')
      const aliasIds = users.map((user: any) => user.uuid)
      _push = _push.setAudience(JPush.alias(aliasIds))
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
}

export default PushService
