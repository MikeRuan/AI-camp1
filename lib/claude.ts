import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert web developer helping kids aged 10-14 build their first websites and games.

RULES (follow strictly):
1. Always return a SINGLE self-contained HTML file with all CSS and JavaScript included inline.
2. No external dependencies, no npm packages, no CDN links (no Bootstrap, jQuery, React, etc.).
3. The file must work when opened directly in any browser.
4. Make it visually polished, colorful, and mobile-friendly — it should look impressive!
5. Add helpful comments throughout the code so students can learn from it.
6. Output RAW HTML ONLY — no markdown code fences, no backticks, no explanation text before or after.
7. Start your response directly with <!DOCTYPE html> and end with </html>.

When modifying existing code:
- You will receive the previous HTML in the user message.
- Preserve all existing functionality unless explicitly asked to remove it.
- Apply the requested changes on top of the existing code.
- Keep the same overall structure and style unless asked to change it.

Make the result something a kid will be proud to share with their friends!`;

export async function generateCode(
  prompt: string,
  existingCode?: string
): Promise<ReadableStream<Uint8Array>> {
  const userMessage = existingCode
    ? `Here is my current website/game code:\n\n${existingCode}\n\nPlease make this change: ${prompt}`
    : prompt;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          controller.enqueue(new TextEncoder().encode(chunk.delta.text));
        }
      }
      controller.close();
    },
  });
}

export async function generateCodeFull(
  prompt: string,
  existingCode?: string
): Promise<string> {
  const userMessage = existingCode
    ? `Here is my current website/game code:\n\n${existingCode}\n\nPlease make this change: ${prompt}`
    : prompt;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
}
