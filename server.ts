import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;

if (apiKey) {
  aiClient = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
} else {
  console.warn("GEMINI_API_KEY not found in environment. Running translator in mock mode.");
}

// API Route for Sign Language Translation & Polish
app.post("/api/translate", async (req, res) => {
  const { words } = req.body;

  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'words' field in request body." });
  }

  const rawSequence = words.join(" ").trim();

  // If Gemini is not configured, fallback to a smart mock translation
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
      // Clean up casing and spacing
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
          type: Type.OBJECT,
          properties: {
            translatedText: {
              type: Type.STRING,
              description: "The polished, grammatically correct English sentence translation."
            },
            contextualReplySuggestion: {
              type: Type.STRING,
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
  } catch (error: any) {
    console.error("Gemini Translation Error:", error);
    return res.status(500).json({ error: "Failed to translate with Gemini. Please try again.", details: error.message });
  }
});

// Vite Middleware & Static Asset Routing
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

start();
