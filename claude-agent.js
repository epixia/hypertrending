// claude-agent.js
const Anthropic = require("@anthropic-ai/sdk");
const { startEvent, finishEvent, errorEvent } = require("./monitor");

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function askClaude(prompt) {
  const project = "hypertrending";
  const agent = "n8n-slack-bot";
  const type = "message";

  const id = await startEvent({
    project,
    agent,
    type,
    meta: { prompt },
  });

  try {
    const resp = await claude.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    await finishEvent(id, {
      project,
      agent,
      type,
      result: {
        text: resp.content?.[0]?.text || "",
        model: resp.model,
      },
      meta: {
        prompt,
        input_tokens: resp.usage?.input_tokens,
        output_tokens: resp.usage?.output_tokens,
      },
    });

    return resp;
  } catch (err) {
    await errorEvent(id, {
      project,
      agent,
      type,
      error: err,
      meta: { prompt },
    });
    throw err;
  }
}

module.exports = { askClaude };
