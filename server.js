const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

// Load environment variables
dotenv.config({
    path: path.join(__dirname, ".env")
});

const app = express();
const PORT = 3000;

// Gemini
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Middleware
app.use(express.json());

// Serve your frontend files
app.use(express.static(__dirname));


// =========================
// CREATE TASKS
// =========================

app.post("/api/tasks", async (req, res) => {

    try {

        const { text } = req.body;

        // Make sure we actually received text
        if (!text || !text.trim()) {

            return res.status(400).json({
                error: "No text provided."
            });

        }


        const prompt = `
You are the task extraction system for an app called "notyourToDo".

The user will give you messy, natural human speech or text about
things they want to do.

Your job is to extract the distinct actionable tasks.

IMPORTANT RULES:

- Ignore filler words.
- Ignore hesitation such as "umm", "uhh", "mhm", "yeah", "idk", etc.
- Ignore meaningless or accidental speech.
- Fix obvious speech-to-text mistakes.
- Keep the user's intended meaning.
- Turn each distinct action into ONE task.
- Do not invent tasks.
- Do not add explanations.
- Keep task titles short and natural.
- Start task titles with a natural action.
- Return only the requested JSON structure.

Example:

User:
"so today ill make breakfast then hit th gym, call my mom,
and later do the laundry mhmm yeah thats it"

Tasks:
- Make breakfast
- Hit the gym
- Call mom
- Do the laundry

User input:
"${text}"
`;


        // Ask Gemini for structured JSON
        const response = await ai.models.generateContent({

            model: "gemini-3.7-flash",

            contents: prompt,

            config: {
                responseFormat: {
                    text: {
                        mimeType: "application/json",

                        schema: {
                            type: "object",

                            properties: {

                                tasks: {
                                    type: "array",

                                    items: {
                                        type: "object",

                                        properties: {

                                            title: {
                                                type: "string"
                                            }

                                        },

                                        required: ["title"]
                                    }
                                }

                            },

                            required: ["tasks"]
                        }
                    }
                }
            }

        });


        const result = JSON.parse(
    response.text.replace(/```json|```/g, "").trim()
);

        console.log("AI result:", result);

        res.json(result);


    } catch (error) {

        console.error("Gemini error:", error);

        res.status(500).json({
            error: "Something went wrong while creating your tasks."
        });

    }

});


// =========================
// START SERVER
// =========================

app.listen(PORT, () => {

    console.log(`notyourToDo running at http://localhost:${PORT}`);

});
