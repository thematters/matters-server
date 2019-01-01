// @ts-ignore
import { JPushAsync, JPush } from 'jpush-async'

import { environment, isTest, isDev } from 'common/environment'
import { BaseService } from '../baseService'

export type PushParams = {
  title?: string
  text: string
  userIds: [string]
  topic?: any
  broadcast?: boolean
  platform?: 'ios' | 'android'
}

class PushService extends BaseService {
  client: any

  constructor() {
    super('push_device')
    this.client = JPushAsync.buildClient(
      environment.jpushKey,
      environment.jpushSecret
    )
  }

  private __getAlaisByUser(user: any) {
    return user.uuid.replace(/-/g, '')
  }

  push = async ({
    title,
    text,
    userIds,
    topic,
    broadcast,
    platform
  }: PushParams) => {
    if (isTest || isDev) {
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
      const aliasIds = users.map((user: any) => this.__getAlaisByUser(user))
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
    await _push.send()
  }
}

export const pushService = new PushService()
