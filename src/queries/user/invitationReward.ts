import { InvitationStatusToRewardResolver } from 'definitions'
import { connectionFromPromisedArray, i18n } from 'common/utils'
import { MAT_UNIT } from 'common/enums'

const trans = {
  reward: i18n({
    zh_hant: `帮助對方快速成为 Matters 会员，新会员激活后，你会获得 ${
      MAT_UNIT.invitationAccepted
    }MAT，对方將獲得 ${MAT_UNIT.joinByInvitation}MAT。`,
    zh_hans: `帮助对方快速成为 Matters 会员，新会员激活后，你会获得 ${
      MAT_UNIT.invitationAccepted
    }MAT，对方将获得 ${MAT_UNIT.joinByInvitation}MAT。`,
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
