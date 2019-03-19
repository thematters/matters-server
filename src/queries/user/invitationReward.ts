import { InvitationStatusToRewardResolver } from 'definitions'
import { connectionFromPromisedArray, i18n } from 'common/utils'
import { MAT_UNIT } from 'common/enums'

const trans = {
  reward: i18n({
    zh_hant: `Matters是一個優質的內容社群。目前，新註冊的用戶需要透過老用戶邀請，才可以獲得創作者資格。<br/>現階段，每邀請一位好友成功成為創作者，你和對方都將獲得 ${
      MAT_UNIT.joinByInvitation
    } 獎勵。`,
    zh_hans: `Matters是一个优质的内容社区。目前，新注册的用户需要通过老用户邀请，才可以获得创作者资格。<br/>
    现阶段，每邀请一位好友成功成为创作者，你和对方都将获得 ${
      MAT_UNIT.joinByInvitation
    } 奖励。`,
    en: `Once any of your invitee successfully join Matters, you could get ${
      MAT_UNIT.invitationAccepted
    } MATs as a reward while your invitee could get ${
      MAT_UNIT.joinByInvitation
    } MATs.`
  })
}

const resolver: InvitationStatusToRewardResolver = async (
  parent,
  _,
  { viewer }
) => {
  return trans.reward(viewer.language, {})
}

export default resolver
