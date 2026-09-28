export type Goal = 'whiter' | 'alignment' | 'shape' | 'harmony' | 'health' | 'guide';

export type Step =
  | 'welcome'
  | 'photo'
  | 'consent'
  | 'goal'
  | 'generating'
  | 'profile'
  | 'share'
  | 'analyzeGoal'
  | 'analyzing'
  | 'analysis'
  | 'contact';

export interface SmileProfile {
  profileName: string;
  variant: string;
  description: string;
  attributes: { label: string; level: string; dots: number }[];
  priorities: string[];
  shareText: string;
}

export interface SmileAnalysisFinding {
  category: string;
  title: string;
  observation: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface SmileAnalysis {
  imageQuality: {
    usable: boolean;
    reason?: string;
  };
  selectedGoal: string;
  importance: number;
  summary: string;
  findings: SmileAnalysisFinding[];
  strengths: string[];
  explorationTopics: string[];
  requiresProfessionalEvaluation: string[];
  limitations: string;
  whatsappSummary: string;
}

export interface ImageFeatures {
  brightness: number;
  contrast: number;
  warmth: number;
  uniformity: number;
  edgeDensity: number;
  symmetryScore: number;
  usable: boolean;
  reason?: string;
}

export interface AnalysisRequest {
  image: string;
  selectedGoal: Goal;
  importance: number;
}

export interface AnalysisResponse {
  analysis: SmileAnalysis;
}
