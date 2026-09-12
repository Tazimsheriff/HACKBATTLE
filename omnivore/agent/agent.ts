import { defineAgent } from "eve";

export default defineAgent({
  // Using OpenRouter via AI Gateway. Set OPENROUTER_API_KEY in .env.local
  // For eve's built-in gateway: set AI_GATEWAY_API_KEY
  model: "google/gemini-2.0-flash-001",
});
