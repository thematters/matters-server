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
    type,
    code,
    language = 'zh_hant'
  }: {
    to: string
    type: keyof typeof VERIFICATION_CODE_TYPES
    code: string
    language?: keyof typeof LANGUAGE
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.verificationCode
    const subject = {
      register: '你的註冊驗證碼',
      email_reset: '你的修改郵箱驗證碼',
      password_reset: '你的重置密碼驗證碼',
      email_verify: '你的郵箱認證驗證碼'
    }[type]
    const dataType = {
      register: '註冊',
      email_reset: '修改郵箱',
      password_reset: '重置密碼',
      email_verify: '郵箱認證'
    }[type]

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore https://github.com/sendgrid/sendgrid-nodejs/issues/729
          dynamic_template_data: {
            subject,
            code,
            type: dataType
          }
        }
      ]
    })
  }

  sendRegisterSuccess = async ({
    to,
    language = 'zh_hant',
    displayName
  }: {
    to: string
    language?: keyof typeof LANGUAGE
    displayName: string
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.registerSuccess
    const subject = '註冊成功'

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            displayName
          }
        }
      ]
    })
  }

  sendInvitationSuccess = async ({
    to,
    language = 'zh_hans',
    senderDisplayName
  }: {
    to: string
    language?: keyof typeof LANGUAGE
    senderDisplayName: string
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.invitationSuccess
    const subject = '你已獲得激活資格'

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            senderDisplayName
          }
        }
      ]
    })
  }

  sendActivationSuccess = async ({
    to,
    language = 'zh_hans',
    recipientDisplayName,
    senderDisplayName
  }: {
    to: string
    language?: keyof typeof LANGUAGE
    recipientDisplayName: string
    senderDisplayName: string
  }) => {
    // TODO: language
    const templateId = EMAIL_TEMPLATE_ID.activationSuccess
    const subject = '帳戶激活成功'

    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            recipientDisplayName,
            senderDisplayName
          }
        }
      ]
    })
  }
}

export const mail = new Mail()
