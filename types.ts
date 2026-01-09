export interface Subtitle {
  id: string;
  originalText?: string;
  bengaliPhonetic: string;
  vietnameseTranslation: string; // Changed from Phonetic to Translation
}

export interface AnalysisResult {
  faceDescription: string;
  voiceDescription: string;
  subtitles: Subtitle[];
  summary: string;
}

export interface MatchResult {
  targetVideoId: string;
  targetVideoName: string;
  similarityPercentage: number;
  matchType: 'Face' | 'Voice' | 'Face + Voice'; // Added match type
  reason: string;
  timestamp: number; // Added for sort
}

export interface VideoRecord {
  id: string;
  file: File;
  videoUrl: string; // Blob URL for preview
  fileName: string;
  uploadTime: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  analysis?: AnalysisResult;
  matches: MatchResult[];
}

export enum AppView {
  UPLOAD = 'UPLOAD',
  LIBRARY = 'LIBRARY',
  ANALYSIS = 'ANALYSIS'
}