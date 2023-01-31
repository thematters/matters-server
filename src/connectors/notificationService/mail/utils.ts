import { i18n } from 'common/utils/i18n'

export const trans = {
  verificationCode: {
    register: i18n({
      zh_hant: 'Matters | 註冊驗證',
      zh_hans: 'Matters | 注册验证',
    }),
    email_reset: i18n({
      zh_hant: 'Matters | 修改電子信箱驗證',
      zh_hans: 'Matters | 修改邮箱验证',
    }),
    email_reset_confirm: i18n({
      zh_hant: 'Matters | 修改電子信箱驗證',
      zh_hans: 'Matters | 修改邮箱验证',
    }),
    password_reset: i18n({
      zh_hant: 'Matters | 修改密碼驗證',
      zh_hans: 'Matters | 修改密码验证',
    }),
    payment_password_reset: i18n({
      zh_hant: 'Matters | 修改交易密碼驗證',
      zh_hans: 'Matters | 修改交易密码验证',
    }),
  },
  registerSuccess: i18n({
    zh_hant: '歡迎來到 Matters 宇宙航艦，這是為你準備的登船指南',
    zh_hans: '欢迎来到 Matters 宇宙航舰，这是为你准备的登船指南',
  }),
  userDeleted: i18n({
    zh_hant: 'Matters | 你的賬號已被註銷',
    zh_hans: 'Matters | 你的账号已被注销',
  }),
  migration: i18n({
    zh_hant: '搬家完成啦，立刻回到 Matters 進行宇宙傳輸吧！',
    zh_hans: '搬家完成啦，立刻回到 Matters 进行宇宙传输吧！',
  }),
  payment: {
    passwordSet: i18n({
      zh_hant: 'Matters | 你的交易密碼已成功設定',
      zh_hans: 'Matters | 你的交易密码已成功设定',
    }),
    passwordChanged: i18n({
      zh_hant: 'Matters | 你的交易密碼已修改成功',
      zh_hans: 'Matters | 你的交易密码已修改成功',
    }),
    creditAdded: i18n({
      zh_hant: 'Matters | 儲值成功',
      zh_hans: 'Matters | 储值成功',
    }),
    donated: i18n({
      zh_hant: 'Matters | 支付成功',
      zh_hans: 'Matters | 支付成功',
    }),
    receivedDonation: i18n({
      zh_hant: 'Matters | 你收到一筆來自他人的支持',
      zh_hans: 'Matters | 你收到一笔来自他人的支持',
    }),
    receivedDonationLikeCoin: i18n({
      zh_hant: 'Matters | 你收到一筆來自他人的支持',
      zh_hans: 'Matters | 你收到一笔来自他人的支持',
    }),
    payout: i18n({
      zh_hant: 'Matters | 你的提現流程已經啟動',
      zh_hans: 'Matters | 你的提现流程已经启动',
    }),
  },
  tag: {
    adoptTag: i18n<{ displayName: string; content: string }>({
      zh_hant: ({ displayName, content }) =>
        `${displayName}，你已成為 #${content} 的主理人，你做好準備了嗎？`,
      zh_hans: ({ displayName, content }) =>
        `${displayName}，你已成为 #${content} 的主理人，你做好准备了吗？`,
    }),
    assignAsTagEditor: i18n<{ displayName: string; content: string }>({
      zh_hant: ({ displayName, content }) =>
        `${displayName}，你已成為 #${content} 的協作者，你做好準備了嗎？`,
      zh_hans: ({ displayName, content }) =>
        `${displayName}，你已成为 #${content} 的协作者，你做好准备了吗？`,
    }),
  },
  circle: {
    invitation: i18n<{ sender: string; circle: string }>({
      zh_hant: ({ sender, circle }) =>
        `Matters | ${sender} 正在邀請你進入${circle}圍爐，你現在可免費加入！`,
      zh_hans: ({ sender, circle }) =>
        `Matters | ${sender} 正在邀请你进入${circle}围炉，你现在可免费加入！`,
    }),
  },
  cryptoWallet: {
    airdrop: i18n({
      zh_hant: 'Matters | 你已經成功參加空投！',
      zh_hans: 'Matters | 你已经成功参加空投！',
    }),
    connected: i18n({
      zh_hant: 'Matters | 你已經成功設定加密錢包！',
      zh_hans: 'Matters | 你已经成功设定加密钱包！',
    }),
  },
}
