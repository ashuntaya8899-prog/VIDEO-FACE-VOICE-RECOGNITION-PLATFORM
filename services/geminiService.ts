import { GoogleGenAI, Schema, Type } from "@google/genai";
import { AnalysisResult, MatchResult } from "../types";

const API_KEY = process.env.API_KEY || '';

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result as string;
      const base64Content = base64Data.split(',')[1];
      resolve({
        inlineData: {
          data: base64Content,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeVideoContent = async (file: File): Promise<AnalysisResult> => {
  try {
    const videoPart = await fileToGenerativePart(file);

    const prompt = `
      Bạn là một chuyên gia phân tích video pháp y và ngôn ngữ học.
      Nhiệm vụ:
      1. Phân tích khuôn mặt của người chính trong video (Face Recognition Data). Mô tả chi tiết đặc điểm khuôn mặt.
      2. Phân tích giọng nói (Voice Recognition Data). Mô tả âm sắc, cao độ, giọng điệu.
      3. Tạo phụ đề cho toàn bộ nội dung nói trong video (Subtitle Extraction).
         - Cột 1: Tiếng Bengali (Giữ nguyên dạng phiên âm Latin/Phonetic, KHÔNG dịch, KHÔNG chỉnh sửa).
         - Cột 2: Tiếng Việt (Dịch nghĩa tự nhiên, đúng ngữ pháp tiếng Việt, KHÔNG dùng phiên âm).
         - Không cần timestamps.
      
      Trả về định dạng JSON thuần túy.
    `;

    const responseSchema: Schema = {
      type: Type.OBJECT,
      properties: {
        faceDescription: { type: Type.STRING, description: "Mô tả chi tiết đặc điểm khuôn mặt" },
        voiceDescription: { type: Type.STRING, description: "Mô tả đặc điểm giọng nói" },
        summary: { type: Type.STRING, description: "Tóm tắt ngắn gọn nội dung video" },
        subtitles: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              bengaliPhonetic: { type: Type.STRING, description: "Phiên âm tiếng Bengali (giữ nguyên)" },
              vietnameseTranslation: { type: Type.STRING, description: "Dịch nghĩa Tiếng Việt tự nhiên" },
            },
            required: ["bengaliPhonetic", "vietnameseTranslation"]
          }
        }
      },
      required: ["faceDescription", "voiceDescription", "subtitles", "summary"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        role: "user",
        parts: [
          videoPart,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    if (response.text) {
        const data = JSON.parse(response.text);
        // Add IDs to subtitles for React keys
        data.subtitles = data.subtitles.map((sub: any, index: number) => ({
            ...sub,
            id: `sub-${index}`
        }));
        return data as AnalysisResult;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Error analyzing video:", error);
    throw error;
  }
};

export const compareProfiles = async (
  newProfile: { face: string, voice: string },
  existingProfile: { face: string, voice: string, name: string }
): Promise<MatchResult | null> => {
  try {
    const prompt = `
      So sánh hai hồ sơ sinh trắc học video sau đây.
      
      Hồ sơ A (Mới):
      - Khuôn mặt: ${newProfile.face}
      - Giọng nói: ${newProfile.voice}
      
      Hồ sơ B (Cũ - ${existingProfile.name}):
      - Khuôn mặt: ${existingProfile.face}
      - Giọng nói: ${existingProfile.voice}
      
      Yêu cầu:
      1. Điểm số tương đồng (0-100).
      2. Loại trùng khớp: "Face" (chỉ khuôn mặt), "Voice" (chỉ giọng nói), hoặc "Face + Voice" (cả hai).
      3. Lý do ngắn gọn.
      
      Nếu điểm > 75, coi như trùng khớp.
      Trả về JSON.
    `;

    const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
            similarityPercentage: { type: Type.INTEGER },
            matchType: { type: Type.STRING, enum: ["Face", "Voice", "Face + Voice"] },
            reason: { type: Type.STRING }
        },
        required: ["similarityPercentage", "matchType", "reason"]
    };

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    });

    if (response.text) {
        const result = JSON.parse(response.text);
        if (result.similarityPercentage > 75) {
             return {
                targetVideoId: "N/A", // Filled by caller
                targetVideoName: existingProfile.name,
                similarityPercentage: result.similarityPercentage,
                matchType: result.matchType,
                reason: result.reason,
                timestamp: Date.now() // Placeholder
            };
        }
    }
    return null;

  } catch (error) {
    console.error("Error comparing profiles:", error);
    return null;
  }
};
