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
- Wrap ALL code in a DOMContentLoaded listener: document.addEventListener('DOMContentLoaded', function() { ... });
- Inside that listener: query elements, attach event listeners, then start any game loop.
- NEVER use onclick="functionName()" attributes on HTML elements — always use addEventListener('click', handler) inside DOMContentLoaded.
- For canvas games: get the canvas and context inside DOMContentLoaded, then start the game loop.
- requestAnimationFrame must only be called after the canvas is ready.
- Every button must have a working click handler verified inside DOMContentLoaded.

CANVAS LAYERING RULES (very important — buttons must always be clickable):
- The start/menu screen must have CSS: position:relative; z-index:100; pointer-events:auto;
- The <canvas> element must have CSS: position:absolute; z-index:1; (LOWER than the start screen)
- When the game starts (button clicked): set startScreen.style.display='none', then show and start the canvas.
- NEVER place a <canvas> on top of HTML buttons or overlays. Always hide the canvas until the game begins.
- Structure: wrap everything in a container div. Put canvas inside with z-index:1. Put start screen overlay on top with z-index:100.

When modifying existing code:
- Preserve all existing functionality unless explicitly asked to change it.
- Apply changes on top of the existing code, keeping the same structure and style.`;

// Assistant prefill — used for non-streaming only
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
    messages: [{ role: "user", content: userMessage }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      // Buffer chunks until we find <!DOCTYPE html>, then stream from there.
      // This strips any explanation text Claude may emit before the HTML.
      let htmlStarted = false;
      let buffer = "";

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_delta" &&
          chunk.delta.type === "text_delta"
        ) {
          const text = chunk.delta.text;

          if (htmlStarted) {
            controller.enqueue(encoder.encode(text));
          } else {
            buffer += text;
            const idx = buffer.toLowerCase().indexOf("<!doctype html>");
            if (idx !== -1) {
              htmlStarted = true;
              const htmlContent = buffer.slice(idx);
              if (htmlContent) controller.enqueue(encoder.encode(htmlContent));
              buffer = "";
            }
          }
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
