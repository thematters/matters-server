import type { GQLMutationResolvers } from 'definitions'

import {
  MINUTE,
  VERIFICATION_CODE_EXPIRED_AFTER,
  SKIPPED_LIST_ITEM_TYPES,
  VERIFICATION_CODE_PROTECTED_TYPES,
  VERIFICATION_DOMAIN_WHITELIST,
  VERIFICATION_CODE_TYPE,
  USER_STATE,
} from 'common/enums'
import { isProd } from 'common/environment'
import {
  AuthenticationError,
  EmailExistsError,
  ForbiddenError,
  EmailNotFoundError,
  UserInputError,
  ForbiddenByStateError,
} from 'common/errors'
import { getLogger } from 'common/logger'
import { extractRootDomain, verifyCaptchaToken } from 'common/utils'
import { Passphrases } from 'connectors/passphrases'

const logger = getLogger('mutation-send-verificaiton-code')

const resolver: GQLMutationResolvers['sendVerificationCode'] = async (
  _,
  { input: { email: rawEmail, type, token, redirectUrl, language } },
  { viewer, dataSources: { userService, notificationService, systemService } }
) => {
  const email = rawEmail.toLowerCase()

  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new AuthenticationError(
      `visitor cannot send verification code of ${type}`
    )
  }

  const user = await userService.findByEmail(email)

  if (user && user.state === USER_STATE.archived) {
    throw new ForbiddenByStateError('email has been archived')
  }

  // register check (`register`, `email_otp` register case)
  if (type === VERIFICATION_CODE_TYPE.register) {
    // check email
    if (user) {
      throw new EmailExistsError('email has been registered')
    }

    const isHuman = token && (await verifyCaptchaToken(token, viewer.ip))
    if (!isHuman) {
      throw new ForbiddenError('registration via scripting is not allowed')
    }
  }
  if (type === VERIFICATION_CODE_TYPE.email_otp && !user) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const isHuman = token && (await verifyCaptchaToken(token, viewer.ip))
    if (!isHuman) {
      throw new ForbiddenError('registration via scripting is not allowed')
    }
  }

  if (
    type === VERIFICATION_CODE_TYPE.payment_password_reset ||
    type === VERIFICATION_CODE_TYPE.password_reset ||
    type === VERIFICATION_CODE_TYPE.email_reset ||
    type === VERIFICATION_CODE_TYPE.email_verify
  ) {
    if (!user) {
      throw new EmailNotFoundError('cannot find email')
    }
  }

  // check redirectUrl
  if (redirectUrl) {
    const tld = extractRootDomain(redirectUrl)

    if (!tld || !VERIFICATION_DOMAIN_WHITELIST.includes(tld)) {
      throw new UserInputError('"redirectUrl" is invalid.')
    }
  }

  const { agentHash } = viewer
  const {
    AGENT_HASH: TYPE_HASH,
    EMAIL: TYPE_EMAIL,
    DOMAIN: TYPE_DOMAIN,
  } = SKIPPED_LIST_ITEM_TYPES

  const feature = await systemService.getFeatureFlag('fingerprint')
  const isFingerprintEnabled =
    feature && (await systemService.isFeatureEnabled(feature.flag, viewer))

  // verify email if it's in blocklist
  const banEmail = await systemService.findSkippedItem(TYPE_EMAIL, email)
  if (banEmail && banEmail.archived === false) {
    if (agentHash) {
      await systemService.createSkippedItem({
        type: TYPE_HASH,
        uuid: banEmail.uuid,
        value: agentHash,
      })
    }
    logger.warn(`email ${email} is in blocklist`)

    if (isFingerprintEnabled) {
      return true
    }
  }

  // verify email doamin if it's in blocklist
  const domain = email.split('@')[1]
  const banDomain = await systemService.findSkippedItem(TYPE_DOMAIN, domain)
  if (banDomain && banDomain.archived === false) {
    logger.warn(`domain ${domain} is in blocklist`)
    return true
  }

  // verify agent hash if it's in blocklist
  if (agentHash) {
    const banAgentHash = await systemService.findSkippedItem(
      TYPE_HASH,
      agentHash
    )
    if (banAgentHash && banAgentHash.archived === false) {
      await systemService.createSkippedItem({
        type: TYPE_EMAIL,
        uuid: banAgentHash.uuid,
        value: email,
      })
      logger.warn(`agent hash ${agentHash} is in blocklist`)

      if (isFingerprintEnabled) {
        return true
      }
    }
  }

  // insert record
  let code = ''
  const isEmailOTP = type === 'email_otp'

  if (isEmailOTP) {
    // generate passpharse for email OTP
    const passphrases = new Passphrases()
    code = (
      await passphrases.generate({
        payload: {
          email,
          // include userId to prevent login to other user's account
          // if email is changed
          ...(user ? { userId: user.id } : {}),
        },
        expiresInMinutes:
          (isProd ? VERIFICATION_CODE_EXPIRED_AFTER : MINUTE * 3) / MINUTE,
      })
    ).join('-')
  } else {
    const result = await userService.createVerificationCode({
      userId: viewer.id,
      email,
      type,
      strong: !!redirectUrl, // strong random code for link
    })
    code = result.code
  }

  // send verification email
  notificationService.mail.sendVerificationCode({
    to: email,
    type,
    code,
    redirectUrl,
    recipient: {
      displayName: (user && user.displayName) ?? null,
    },
    language: language || viewer.language,
  })

  return true
}

export default resolver
