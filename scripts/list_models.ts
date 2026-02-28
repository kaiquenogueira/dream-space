
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("Please set GEMINI_API_KEY environment variable.");
    process.exit(1);
}

const client = new GoogleGenAI({ apiKey });

async function main() {
    try {
        const response = await client.models.list();
        // It seems response is a Pager or array, let's just log it directly first to inspect structure
        console.log(JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

main();
