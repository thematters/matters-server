import notificationQueue from 'connectors/queue/notification'

import { environment } from 'common/environment'
import {
  LANGUAGE,
  EMAIL_TEMPLATE_ID,
  VERIFICATION_CODE_TYPES
} from 'common/enums'

class Mail {
  sendVerificationCode = async ({
    to,
    language = 'zh_hant',
    type,
    code,
    recipientDisplayName
  }: {
    to: string
    language?: keyof typeof LANGUAGE
    type: keyof typeof VERIFICATION_CODE_TYPES
    code: string
    recipientDisplayName?: string
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.verificationCode
    const dataType = {
      register: '註冊',
      email_reset: '修改郵箱',
      password_reset: '修改密碼',
      email_verify: '電子信箱認證'
    }[type]

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore https://github.com/sendgrid/sendgrid-nodejs/issues/729
          dynamic_template_data: {
            subject: `Matters | ${dataType}驗證碼`,
            code,
            type: dataType,
            recipientDisplayName
          }
        }
      ]
    })
  }

  sendRegisterSuccess = async ({
    to,
    language = 'zh_hant',
    recipientDisplayName
  }: {
    to: string
    language?: keyof typeof LANGUAGE
    recipientDisplayName: string
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.registerSuccess

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject: 'Matters | 你已註冊成功',
            recipientDisplayName
          }
        }
      ]
    })
  }

  sendInvitationSuccess = async ({
    to,
    language = 'zh_hans',
    type,
    recipientDisplayName,
    senderDisplayName,
    senderUserName
  }: {
    to: string
    language?: keyof typeof LANGUAGE
    type: 'invitation' | 'activation'
    recipientDisplayName?: string
    senderDisplayName?: string
    senderUserName?: string
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.invitationSuccess

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject: 'Matters | 你被邀請成為內容創作者',
            recipientDisplayName,
            senderDisplayName,
            senderUserName,
            type
          }
        }
      ]
    })
  }
}

export const mail = new Mail()
