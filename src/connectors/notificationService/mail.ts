import { LANGUAGES } from 'definitions'
import { i18n } from 'common/utils/i18n'
import { environment } from 'common/environment'
import { EMAIL_TEMPLATE_ID, VERIFICATION_CODE_TYPES } from 'common/enums'
import notificationQueue from 'connectors/queue/notification'

const trans = {
  verificationCode: {
    subject: i18n<{ type: string }>({
      zh_hant: ({ type }) => `Matters | ${type}驗證碼`,
      zh_hans: ({ type }) => `Matters | ${type}验证码`
    }),
    register: i18n({
      zh_hant: '註冊',
      zh_hans: '注册'
    }),
    email_reset: i18n({
      zh_hant: '修改電子信箱',
      zh_hans: '修改电子邮箱'
    }),
    password_reset: i18n({
      zh_hant: '修改密碼',
      zh_hans: '修改密碼'
    }),
    email_verify: i18n({
      zh_hant: '電子信箱認證',
      zh_hans: '电子邮箱认证'
    })
  },
  registerSuccess: i18n({
    zh_hant: 'Matters | 你已註冊成功',
    zh_hans: 'Matters | 你已注册成功'
  }),
  invitationSuccess: i18n({
    zh_hant: 'Matters | 你被邀請成為內容創作者',
    zh_hans: 'Matters | 你被邀请成为内容创作者'
  }),
  userActivated: i18n({
    zh_hant: 'Matters | 你邀請的好友已進站',
    zh_hans: 'Matters | 你邀请的好友已进站'
  })
}

class Mail {
  sendVerificationCode = async ({
    to,
    type,
    code,
    recipient,
    language = 'zh_hant'
  }: {
    to: string
    type: keyof typeof VERIFICATION_CODE_TYPES
    code: string
    recipient: {
      displayName?: string
    }
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.verificationCode[language]
    const codeTypeStr = trans.verificationCode[type](language, {})
    const subject = trans.verificationCode.subject(language, {
      type: codeTypeStr
    })
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
            type: codeTypeStr,
            recipient
          }
        }
      ]
    })
  }

  sendRegisterSuccess = async ({
    to,
    recipient,
    language = 'zh_hant'
  }: {
    to: string
    recipient: {
      displayName?: string
    }
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.registerSuccess[language]
    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject: trans.registerSuccess(language, {}),
            recipient
          }
        }
      ]
    })
  }

  sendInvitationSuccess = async ({
    to,
    type,
    recipient,
    sender,
    language = 'zh_hant'
  }: {
    to: string
    type: 'invitation' | 'activation'
    recipient?: {
      displayName?: string
      userName?: string
    }
    sender: {
      displayName?: string
      userName?: string
    }
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.invitationSuccess[language]
    const subject = trans.invitationSuccess(language, {})
    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            recipient,
            sender,
            invitation: type === 'invitation',
            activation: type === 'activation'
          }
        }
      ]
    })
  }

  sendUserActivated = async ({
    to,
    recipient,
    email,
    userName,
    language = 'zh_hant'
  }: {
    to: string
    recipient?: {
      displayName?: string
      userName?: string
    }
    email: string
    userName: string
    language?: LANGUAGES
  }) => {
    const templateId = EMAIL_TEMPLATE_ID.userActivated[language]
    const subject = trans.userActivated(language, {})
    notificationQueue.sendMail({
      from: environment.emailFromAsk as string,
      templateId,
      personalizations: [
        {
          to,
          // @ts-ignore
          dynamic_template_data: {
            subject,
            recipient,
            email,
            userName
          }
        }
      ]
    })
  }
}

export const mail = new Mail()
