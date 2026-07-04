import axios from 'axios'

export const TELEGRAM_API_TIMEOUT_MS = 5000

export type SendTelegramMessageParams = {
  botToken: string
  chatId: string
  /** Optional forum topic id; empty string means "no topic". */
  threadId?: string
  /** Message body, rendered with Telegram HTML parse mode. */
  text: string
}

/**
 * Send a message to a Telegram chat via the Bot API (HTML parse mode,
 * web-page previews disabled). Returns the created message id so callers
 * can edit the message later.
 */
export const sendTelegramMessage = async ({
  botToken,
  chatId,
  threadId,
  text,
}: SendTelegramMessageParams): Promise<number> => {
  const resp = await axios.post(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      chat_id: chatId,
      ...(threadId ? { message_thread_id: Number(threadId) } : {}),
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    },
    { timeout: TELEGRAM_API_TIMEOUT_MS }
  )
  return resp.data.result.message_id as number
}
