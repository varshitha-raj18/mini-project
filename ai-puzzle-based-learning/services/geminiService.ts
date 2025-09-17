import { GoogleGenAI, Type, Chat, GenerateContentResponse } from "@google/genai";
import { Theme, Level1Question, MindMapNode, Flashcard } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const textModel = 'gemini-2.5-flash';

const getBasePrompt = (theme: Theme) => {
    const themeInstructions = theme === Theme.FOCUS 
        ? "Your response should be clear, professional, and direct, suitable for deep study."
        : `Your response MUST be in a creative and engaging "${theme}" theme.`;
    return `You are an expert educator and content creator. Your goal is to transform the provided text into an engaging learning aid. ${themeInstructions}`;
};

export const generateSummary = async (text: string, theme: Theme): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `${getBasePrompt(theme)}\n\nAnalyze the following text and generate a comprehensive summary. The summary should capture the key points and main ideas of the text in a clear and concise manner.\n\nTEXT: """${text}"""`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating summary:", error);
        return "Error: Could not generate a summary for the provided text. Please try again.";
    }
};

export const generateMindMap = async (text: string, theme: Theme): Promise<MindMapNode> => {
     try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `${getBasePrompt(theme)}\n\nAnalyze the following text and generate a hierarchical mind map structure. The mind map should represent the main topics, sub-topics, and key details from the text. Respond with ONLY the JSON object.\n\nTEXT: """${text}"""`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        topic: { type: Type.STRING },
                        children: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    topic: { type: Type.STRING },
                                    children: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                topic: { type: Type.STRING },
                                            },
                                            required: ['topic']
                                        }
                                    }
                                },
                                required: ['topic']
                            }
                        }
                    },
                    required: ['topic']
                },
            },
        });
        
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as MindMapNode;
    } catch (error) {
        console.error("Error generating mind map:", error);
        return { topic: "Error Generating Mind Map", children: [{ topic: "Please try again." }] };
    }
};

export const generateLevel1Questions = async (text: string, theme: Theme, difficulty: 'easy' | 'medium' | 'hard', questionCount: 5 | 10 | 15): Promise<Level1Question[]> => {
     try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `${getBasePrompt(theme)}\n\nBased on the following text, create a ${difficulty} level practice test with exactly ${questionCount} multiple-choice questions. Each question must have 4 options and you must indicate the single correct answer. Respond with ONLY the JSON array.\n\nTEXT: """${text}"""`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            question: { type: Type.STRING },
                            options: { type: Type.ARRAY, items: { type: Type.STRING } },
                            answer: { type: Type.STRING }
                        },
                        required: ['question', 'options', 'answer']
                    }
                }
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Level1Question[];
    } catch (error) {
        console.error(`Error generating ${difficulty} test questions:`, error);
        return [{ question: 'Failed to generate questions. Please try again.', options: [], answer: '' }];
    }
};

export const generateLevel2Flashcards = async (text: string, theme: Theme): Promise<Flashcard[]> => {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `${getBasePrompt(theme)}\n\nBased on the following text, identify 8 key terms or concepts. For each one, provide a concise, one-sentence definition. Respond with ONLY the JSON array.\n\nTEXT: """${text}"""`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            term: { type: Type.STRING },
                            definition: { type: Type.STRING }
                        },
                        required: ['term', 'definition']
                    }
                }
            },
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText) as Flashcard[];
    } catch (error) {
        console.error("Error generating flashcards:", error);
        return [{ term: 'Error', definition: 'Failed to generate flashcards. Please try again.' }];
    }
};

export const generateLevel3Scenario = async (text: string, theme: Theme): Promise<{ scenario: string, question: string }> => {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `${getBasePrompt(theme)}\n\nAnalyze the provided text. Create a VERY BRIEF (1-2 sentences) real-world scenario based on the text. Then, formulate a SINGLE, DIRECT question for the user to answer. The goal is a quick application of knowledge, not a long story. Respond with ONLY a JSON object.\n\nTEXT: """${text}"""`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        scenario: { type: Type.STRING, description: "A very brief 1-2 sentence scenario." },
                        question: { type: Type.STRING, description: "A single, direct question for the user." }
                    },
                    required: ['scenario', 'question']
                }
            }
        });
        const jsonText = response.text.trim();
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Error generating level 3 scenario:", error);
        return { scenario: 'Failed to generate a scenario.', question: 'Please try advancing to this level again.' };
    }
};

export const evaluateLevel3Answer = async (baseText: string, scenario: string, question: string, userAnswer: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: textModel,
            contents: `You are an expert, empathetic tutor. Your task is to evaluate a student's answer to a scenario-based question. The student's answer might be short or informally phrased. Focus on understanding the *essence* and the core concepts the student is trying to convey, rather than nitpicking grammar or wording. Be a supportive mentor.
            
First, state whether the student is on the right track in a friendly tone. Then, provide constructive, encouraging feedback. Acknowledge the correct parts of their thinking and gently guide them on areas for improvement or concepts they might have missed, always referring back to the source material for justification.

SOURCE TEXT: """${baseText}"""

SCENARIO: "${scenario}"

QUESTION: "${question}"

STUDENT'S ANSWER: "${userAnswer}"

EVALUATION:`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error evaluating answer:", error);
        return "Sorry, I was unable to evaluate your answer at this time. Please try again.";
    }
};

export const createChat = (text: string, theme: Theme): Chat => {
    return ai.chats.create({
        model: textModel,
        config: {
            systemInstruction: `You are a helpful study assistant. Your goal is to answer questions and discuss the provided text in detail. Maintain a helpful and encouraging tone, using a "${theme}" theme in your responses. THE DOCUMENT YOU ARE DISCUSSING IS: """${text}"""`,
        }
    });
};