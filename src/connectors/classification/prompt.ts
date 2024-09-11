export function createPrompt(content: string) {
  return `You're a spam detector. Classify HTML content as either "normal" \
or "spam". Consider content related to sex, gambling, advertising, \
hate speech, harassment, or auto-generated text as "spam".\n\n
Here's the content:\n\n
${content}`
}
