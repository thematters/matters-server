import axios from 'axios'

import {
  BLOCKLIST_TYPES,
  VERIFICATION_CODE_PROTECTED_TYPES,
  VERIFICATION_CODE_TYPES
} from 'common/enums'
import { environment, isTest } from 'common/environment'
import {
  ActionFailedError,
  AuthenticationError,
  EmailExistsError,
  EmailNotFoundError,
  UserInputError
} from 'common/errors'
import logger from 'common/logger'
import { MutationToSendVerificationCodeResolver } from 'definitions'

const resolver: MutationToSendVerificationCodeResolver = async (
  _,
  { input: { email: rawEmail, type, token } },
  { viewer, dataSources: { userService, notificationService } }
) => {
  const email = rawEmail ? rawEmail.toLowerCase() : null

  if (!viewer.id && VERIFICATION_CODE_PROTECTED_TYPES.includes(type)) {
    throw new AuthenticationError(
      `visitor cannot send verification code of ${type}`
    )
  }

  let user

  // register check
  if (type === VERIFICATION_CODE_TYPES.register) {
    // check email
    user = await userService.findByEmail(email)
    if (user) {
      throw new EmailExistsError('email has been registered')
    }

    // check token for Turing test
    if (!token) {
      throw new UserInputError('please register on matters.news')
    } else if (!isTest) {
      // Turing test with recaptcha
      const {
        data: { success, score }
      } = await axios({
        method: 'post',
        url: 'https://www.google.com/recaptcha/api/siteverify',
        params: {
          secret: environment.recaptchaSecret,
          response: token,
          remoteip: viewer.ip
        }
      })

      if (!success) {
        throw new ActionFailedError('please try again')
      }

      // use 0.5 for Turing test
      if (score < 0.5) {
        throw new ActionFailedError('cannot verify human')
      }
    }
  }

  if (
    type === VERIFICATION_CODE_TYPES.password_reset ||
    type === VERIFICATION_CODE_TYPES.email_reset
  ) {
    user = await userService.findByEmail(email)
    if (!user) {
      throw new EmailNotFoundError('cannot find email')
    }
  }

  const { agentHash } = viewer
  const { AGENT_HASH: TYPE_HASH, EMAIL: TYPE_EMAIL } = BLOCKLIST_TYPES

  // verify email if it's in blocklist
  const banEmail = await userService.findBanValue(TYPE_EMAIL, email)
  if (banEmail) {
    if (agentHash) {
      await userService.saveBanValue(TYPE_HASH, banEmail.uuid, agentHash)
    }
    logger.info(new Error('email is in blocklist'))
    return true
  }

  // verify agent hash if it's in blocklist
  if (agentHash) {
    const banAgentHash = await userService.findBanValue(TYPE_HASH, agentHash)
    if (banAgentHash) {
      await userService.saveBanValue(TYPE_EMAIL, banAgentHash.uuid, email)
    }
    logger.info(new Error('agent hash is in blocklist'))
    return true
  }

  // insert record
  const { code } = await userService.createVerificationCode({
    userId: viewer.id,
    email,
    type
  })

  // send verification email
  notificationService.mail.sendVerificationCode({
    to: email,
    type,
    code,
    recipient: {
      displayName: user && user.displayName
    },
    language: viewer.language
  })

  return true
}

export default resolver
