"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
app.use(import_express.default.json());
var PORT = 3e3;
var apiKey = process.env.GEMINI_API_KEY;
var aiClient = null;
if (apiKey) {
  aiClient = new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY not found in environment. Running translator in mock mode.");
}
app.post("/api/translate", async (req, res) => {
  const { words } = req.body;
  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'words' field in request body." });
  }
  const rawSequence = words.join(" ").trim();
  if (!aiClient) {
    let translatedText = rawSequence;
    let contextualReplySuggestion = "That's good to know!";
    const seqUpper = rawSequence.toUpperCase();
    if (seqUpper.includes("HELLO") && seqUpper.includes("THANK YOU")) {
      translatedText = "Hello! Thank you very much.";
      contextualReplySuggestion = "You're welcome! How can I help you today?";
    } else if (seqUpper.includes("HELP") && seqUpper.includes("EMERGENCY")) {
      translatedText = "Please help! This is an emergency situation.";
      contextualReplySuggestion = "I am calling for emergency help right now. Please stay calm.";
    } else if (seqUpper.includes("HELLO") && seqUpper.includes("YES")) {
      translatedText = "Hello! Yes, I agree.";
      contextualReplySuggestion = "Awesome, let's move forward.";
    } else if (seqUpper.includes("I LOVE YOU") && seqUpper.includes("THANK YOU")) {
      translatedText = "I love you, and thank you so much.";
      contextualReplySuggestion = "I love you too! You are very welcome.";
    } else {
      translatedText = rawSequence.charAt(0).toUpperCase() + rawSequence.slice(1).toLowerCase() + ".";
      contextualReplySuggestion = "Thank you for sharing that with me.";
    }
    return res.json({
      translatedText,
      contextualReplySuggestion,
      isMock: true
    });
  }
  try {
    const prompt = `You are a professional ASL (American Sign Language) translation system.
Convert the following raw sequence of detected hand gestures and fingerspelled letters into a natural, grammatically correct, and polite conversational English sentence.

Gesture sequence: "${rawSequence}"

Provide a clean English translation and a friendly, context-aware reply suggestion. Make sure to expand fingerspelled letters (e.g. single letters or short spelling chunks) into words if they clearly spell a name or word (e.g., 'A M Y' -> 'Amy').`;
    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            translatedText: {
              type: import_genai.Type.STRING,
              description: "The polished, grammatically correct English sentence translation."
            },
            contextualReplySuggestion: {
              type: import_genai.Type.STRING,
              description: "A helpful, empathetic conversational reply suggestion for the listener."
            }
          },
          required: ["translatedText", "contextualReplySuggestion"]
        }
      }
    });
    const resultText = response.text?.trim() || "";
    const parsed = JSON.parse(resultText);
    return res.json({
      translatedText: parsed.translatedText,
      contextualReplySuggestion: parsed.contextualReplySuggestion,
      isMock: false
    });
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return res.status(500).json({ error: "Failed to translate with Gemini. Please try again.", details: error.message });
  }
});
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
start();
//# sourceMappingURL=server.cjs.map
