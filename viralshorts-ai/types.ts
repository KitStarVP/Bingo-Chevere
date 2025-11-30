export interface ScriptSegment {
  id: number;
  role: 'hook' | 'body' | 'cta';
  text: string;
  visualPrompt: string;
  durationEstimate: number;
}

export interface GeneratedAsset {
  segmentId: number;
  imageUrl?: string; // base64 data uri
  audioBuffer?: AudioBuffer;
  isGeneratingImage: boolean;
  isGeneratingAudio: boolean;
}

export interface ProjectState {
  topic: string;
  niche: string;
  isGeneratingScript: boolean;
  script: ScriptSegment[];
  assets: Record<number, GeneratedAsset>;
  currentStep: 'input' | 'script' | 'production' | 'preview';
}

export enum NicheType {
  CURIOSITIES = 'Curiosidades y Hechos',
  HORROR = 'Terror y Misterio',
  MOTIVATION = 'Motivación y Negocios',
  HISTORY = 'Historia Sorprendente',
  TECH = 'Futuro y Tecnología'
}