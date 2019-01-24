// @ts-ignore
import { JPushAsync, JPush } from 'jpush-async'

import { environment, isTest, isDev } from 'common/environment'
import logger from 'common/logger'

export type PushParams = {
  title?: string
  text: string
  recipientUUIDs: [string]
  topic?: any
  broadcast?: boolean
  platform?: 'ios' | 'android'
}

class PushService {
  client: any

  constructor() {
    this.client = JPushAsync.buildClient(
      environment.jpushKey,
      environment.jpushSecret
    )
  }

  private __getAlaisByUUID(uuid: string) {
    return uuid.replace(/-/g, '')
  }

  push = async ({
    title,
    text,
    recipientUUIDs,
    topic,
    broadcast,
    platform
  }: PushParams) => {
    if (isTest || isDev) {
      logger.info(text, recipientUUIDs)
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
      const aliasIds = recipientUUIDs.map(uuid => this.__getAlaisByUUID(uuid))
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

export default new PushService()
