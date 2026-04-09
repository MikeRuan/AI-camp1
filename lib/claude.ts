import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an expert web developer helping kids aged 10-14 build their first websites and games.

CRITICAL OUTPUT RULE:
- Your ENTIRE response must be a single valid HTML file.
- Do NOT write any explanation, commentary, or analysis before or after the HTML.
- Do NOT use markdown code fences or backticks.
- Your response begins with <!DOCTYPE html> and ends with </html>. Nothing else.

CODE RULES:
1. Single self-contained HTML file — all CSS and JavaScript inline, no external files.
2. No CDN links, no external libraries (no Bootstrap, jQuery, React, etc.).
3. Must work when opened directly in any browser.
4. Visually polished, colorful, mobile-friendly — impressive for a kid to share!
5. Add short helpful comments so students can learn from the code.

JAVASCRIPT RULES (important for games):
- Define all functions and variables BEFORE they are called.
- For canvas games: initialise the canvas and context inside a DOMContentLoaded listener.
- Never call requestAnimationFrame before the canvas/context is ready.
- Button onclick handlers must be defined before the button is rendered, or use addEventListener after DOMContentLoaded.
- Test that every event listener actually attaches to an existing element.

When modifying existing code:
- Preserve all existing functionality unless explicitly asked to change it.
- Apply changes on top of the existing code, keeping the same structure and style.`;

// Prefill text that forces the model to start directly with the HTML doctype
const ASSISTANT_PREFILL = "<!DOCTYPE html>";

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
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: ASSISTANT_PREFILL },
    ],
  });

  const encoder = new TextEncoder();
  let prefixEmitted = false;

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Emit the prefill text first so the client receives a complete document
      controller.enqueue(encoder.encode(ASSISTANT_PREFILL));

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          let text = chunk.delta.text;

          // Safety net: drop anything before <!DOCTYPE on the very first chunk
          if (!prefixEmitted) {
            prefixEmitted = true;
            const lower = text.toLowerCase();
            const idx = lower.indexOf("<!doctype");
            if (idx > 0) text = text.slice(idx + "<!DOCTYPE html>".length);
            else if (idx === 0) text = text.slice("<!DOCTYPE html>".length);
          }

          if (text) controller.enqueue(encoder.encode(text));
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
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: ASSISTANT_PREFILL },
    ],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return ASSISTANT_PREFILL + content.text;
}
