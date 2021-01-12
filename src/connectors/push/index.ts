import * as firebase from 'firebase-admin'

import { isTest } from 'common/environment'
import logger from 'common/logger'
import { UserService } from 'connectors'

export interface PushParams {
  recipients: string[]
  broadcast?: boolean

  title?: string
  body?: string
  link?: string

  icon?: string
  image?: string
}

class PushService {
  push = async ({
    recipients,
    broadcast,

    title,
    body,
    link,

    icon,
    image,
  }: PushParams) => {
    if (isTest) {
      return
    }

    const userService = new UserService()
    const deviceIds = (
      await userService.findPushDevices({
        userIds: recipients,
      })
    ).map(({ deviceId }: any) => deviceId)
    const URL_LOGO = 'https://matters.news/static/icon-192x192.png'

    if (!deviceIds || deviceIds.length <= 0) {
      return
    }

    /**
     * Send an FCM message
     *
     * https://firebase.google.com/docs/cloud-messaging/send-message#send_to_a_device_group
     */
    const messaging = firebase.messaging()

    await messaging.sendMulticast({
      // common fields
      tokens: deviceIds,
      notification: {
        title,
        body,
      },
      // platform-specific fields
      webpush: {
        fcmOptions: {
          link: link || '/me/notifications',
        },
        notification: {
          tag: 'renotify',
          renotify: true,
          requireInteraction: true,

          // https://documentation.onesignal.com/docs/web-push-notification-icons
          badge: URL_LOGO,
          icon: icon || URL_LOGO,
          image,
        },
      },
    })

    logger.info(`Pushed "${body}" to ${recipients.length} recipient(s).`)
  }
}

export const pushService = new PushService()
