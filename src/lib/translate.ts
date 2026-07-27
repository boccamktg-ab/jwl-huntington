import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function translateGiftRequests(spanishText: string): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `Translate the following child gift request text from Spanish to English. Preserve the meaning faithfully. Return only the translated text, nothing else.\n\n${spanishText}`,
      },
    ],
  })
  const block = message.content[0]
  if (block.type !== 'text') throw new Error('Unexpected response type from Claude')
  return block.text.trim()
}
