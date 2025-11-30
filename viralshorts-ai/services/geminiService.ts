import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ScriptSegment } from "../types";

// Initialize Gemini Client
// WARNING: process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helpers for Audio ---

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- API Functions ---

export const generateViralScript = async (topic: string, niche: string): Promise<ScriptSegment[]> => {
  const prompt = `
    Act as an expert YouTube Shorts scriptwriter. Your goal is maximum retention and monetization.
    Topic: ${topic}
    Niche: ${niche}

    Create a 3-part script (Hook, Body, Call to Action) designed to be under 45 seconds total when read.
    For each part, provide the spoken text and a highly detailed, cinematic visual description for an AI image generator (photorealistic, 9:16 aspect ratio vertical composition description).
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            role: { type: Type.STRING, enum: ['hook', 'body', 'cta'] },
            text: { type: Type.STRING, description: "The exact words to be spoken" },
            visualPrompt: { type: Type.STRING, description: "Detailed prompt for image generation, describing a vertical image" },
            durationEstimate: { type: Type.NUMBER, description: "Estimated seconds to read this segment" }
          },
          required: ["role", "text", "visualPrompt", "durationEstimate"]
        }
      }
    }
  });

  const jsonStr = response.text || "[]";
  const rawSegments = JSON.parse(jsonStr);
  
  // Add IDs
  return rawSegments.map((seg: any, index: number) => ({
    ...seg,
    id: index
  }));
};

export const generateSegmentImage = async (visualPrompt: string): Promise<string | null> => {
  try {
    // Using gemini-2.5-flash-image for generation as requested
    // We enhance the prompt to ensure better vertical composition and style
    const enhancedPrompt = `Cinematic, hyper-realistic, vertical 9:16 aspect ratio, high detail, 4k. ${visualPrompt}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
            { text: enhancedPrompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

export const generateSegmentAudio = async (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    const audioBuffer = await decodeAudioData(
      decode(base64Audio),
      audioContext,
      24000,
      1
    );
    
    return audioBuffer;

  } catch (error) {
    console.error("Audio generation failed:", error);
    return null;
  }
};