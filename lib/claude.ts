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
- Every SINGLE button in the HTML must have its own addEventListener('click',...) call inside DOMContentLoaded. Do NOT leave any button without a click handler.
- MANDATORY FINAL CHECK: Before closing </script>, list every button id in a comment, then confirm each one has addEventListener. Example:
  // BUTTON CHECKLIST: #startBtn ✓  #restartBtn ✓  #menuBtn ✓

STORAGE RULE:
- Do NOT use localStorage or sessionStorage — they are blocked in the preview environment and will crash the game silently.
- Store all game state (scores, lives, level) in regular JavaScript variables only.

CANVAS LAYERING RULES (very important — buttons must always be clickable):
- The start/menu screen must have CSS: position:relative; z-index:100; pointer-events:auto;
- The <canvas> element must have CSS: position:absolute; z-index:1; (LOWER than the start screen)
- When the game starts (button clicked): set startScreen.style.display='none', then show and start the canvas.
- NEVER place a <canvas> on top of HTML buttons or overlays. Always hide the canvas until the game begins.
- Structure: wrap everything in a container div. Put canvas inside with z-index:1. Put start screen overlay on top with z-index:100.

When modifying existing code:
- Preserve all existing functionality unless explicitly asked to change it.
- Apply changes on top of the existing code, keeping the same structure and style.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extract all button IDs declared in the HTML portion */
function extractButtonIds(code: string): string[] {
  const ids: string[] = [];
  const re = /<(?:button|input)[^>]+\bid="([^"]+)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    ids.push(m[1]);
  }
  return ids;
}

/** Check which button IDs are missing a click addEventListener */
function missingHandlers(code: string): string[] {
  return extractButtonIds(code).filter((id) => {
    return (
      !code.includes(`'${id}').addEventListener`) &&
      !code.includes(`"${id}").addEventListener`) &&
      !code.includes(`getElementById('${id}').addEventListener`) &&
      !code.includes(`getElementById("${id}").addEventListener`)
    );
  });
}

/** Pull out just the HTML portion (everything from <!DOCTYPE html>) */
function extractHtml(raw: string): string {
  const idx = raw.toLowerCase().indexOf("<!doctype html>");
  return idx !== -1 ? raw.slice(idx) : raw;
}

/** Return true if the code looks complete */
function isComplete(code: string): boolean {
  return code.toLowerCase().includes("</html>") && code.includes("</script>");
}

// ─── Non-streaming generation with validation + auto-retry ───────────────────

async function generateOnce(userMessage: string): Promise<{ code: string; stopReason: string }> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
  });
  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return { code: extractHtml(content.text), stopReason: message.stop_reason ?? "unknown" };
}

/**
 * Generate validated HTML — retries automatically if code is truncated or
 * buttons are missing click handlers. Up to 3 attempts total.
 */
export async function generateCodeValidated(
  prompt: string,
  existingCode?: string
): Promise<string> {
  const baseMessage = existingCode
    ? `Here is my current website/game code:\n\n${existingCode}\n\nPlease make this change: ${prompt}`
    : prompt;

  for (let attempt = 1; attempt <= 3; attempt++) {
    let userMessage = baseMessage;

    // On retry, add explicit guidance about what went wrong
    if (attempt === 2) {
      userMessage = baseMessage +
        "\n\nCRITICAL: Your previous attempt was cut off before </html>. " +
        "Write a SIMPLER, shorter version that fits within the token limit. " +
        "Still make it complete and fun, just use less complex game logic.";
    } else if (attempt === 3) {
      userMessage = baseMessage +
        "\n\nCRITICAL: Write the simplest possible working version. " +
        "Fewer features, shorter code. It MUST end with </html>.";
    }

    const { code, stopReason } = await generateOnce(userMessage);

    if (!isComplete(code)) {
      console.warn(`Attempt ${attempt}: code truncated (stop_reason=${stopReason}), retrying...`);
      continue;
    }

    const missing = missingHandlers(code);
    if (missing.length > 0) {
      console.warn(`Attempt ${attempt}: missing handlers for buttons: ${missing.join(", ")}, retrying...`);
      if (attempt < 3) {
        // Build a targeted fix prompt
        const fixInstruction = existingCode
          ? `Here is my current website/game code:\n\n${existingCode}\n\nPlease make this change: ${prompt}\n\n` +
            `CRITICAL BUG TO FIX: The buttons with these IDs are missing addEventListener('click',...) inside DOMContentLoaded: ${missing.map(id => `#${id}`).join(", ")}. ` +
            `Every button MUST have a click handler. Double-check before finishing.`
          : prompt +
            `\n\nCRITICAL: Make absolutely sure these button IDs each have addEventListener('click',...) inside DOMContentLoaded: ${missing.map(id => `#${id}`).join(", ")}. ` +
            `Add a comment listing every button id and confirm its handler exists.`;
        const { code: fixedCode, stopReason: fixStop } = await generateOnce(fixInstruction);
        if (isComplete(fixedCode) && missingHandlers(fixedCode).length === 0) {
          return fixedCode;
        }
        console.warn(`Fix attempt also had issues (stop=${fixStop}), using original with injected handlers`);
        // Fall through to inject handlers manually
      }
      // Last resort: inject minimal click handlers so the page isn't dead
      return injectMissingHandlers(code, missing);
    }

    return code;
  }

  throw new Error("Failed to generate complete code after 3 attempts. Please try a simpler description.");
}

/**
 * Inject minimal click handlers for any button that has no handler,
 * so at minimum the buttons don't silently do nothing.
 */
function injectMissingHandlers(code: string, missing: string[]): string {
  const injection = missing
    .map(
      (id) =>
        `  /* auto-injected handler for #${id} */\n` +
        `  var _btn_${id} = document.getElementById('${id}');\n` +
        `  if (_btn_${id}) _btn_${id}.addEventListener('click', function() {\n` +
        `    var ss = document.getElementById('startScreen') || document.querySelector('.start-screen, .menu, #menu');\n` +
        `    var cv = document.querySelector('canvas');\n` +
        `    if (ss) ss.style.display = 'none';\n` +
        `    if (cv) cv.style.display = 'block';\n` +
        `  });`
    )
    .join("\n");

  // Insert before </script>
  const scriptEnd = code.lastIndexOf("</script>");
  if (scriptEnd === -1) return code;
  return code.slice(0, scriptEnd) + "\n" + injection + "\n" + code.slice(scriptEnd);
}

// ─── Streaming version (for real-time preview in the editor) ─────────────────

export async function generateCode(
  prompt: string,
  existingCode?: string
): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();

  // Generate validated code first (non-streaming), then stream it to the client.
  // This guarantees complete, working code before the user sees it deploy.
  const code = await generateCodeValidated(prompt, existingCode);

  return new ReadableStream<Uint8Array>({
    start(controller) {
      // Send in chunks to maintain the live-preview feel in the editor.
      const chunkSize = 120;
      for (let i = 0; i < code.length; i += chunkSize) {
        controller.enqueue(encoder.encode(code.slice(i, i + chunkSize)));
      }
      controller.close();
    },
  });
}

// Keep generateCodeFull for any direct callers
export async function generateCodeFull(
  prompt: string,
  existingCode?: string
): Promise<string> {
  return generateCodeValidated(prompt, existingCode);
}
