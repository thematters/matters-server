export function createPrompt(content: string) {
  return `You're a spam detector, category the HTML content with: \
"normal", "spam", "promotion", "sexual", "violence", "auto-generated".\n
Here's the content:
${content}`
}
