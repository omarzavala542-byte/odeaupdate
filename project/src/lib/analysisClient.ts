import type { Goal, ImageFeatures, SmileAnalysis } from '@/types';
import { extractImageFeatures } from '@/lib/imageFeatures';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export async function analyzeSmile(
  imageDataUrl: string,
  selectedGoal: Goal,
  importance: number,
): Promise<SmileAnalysis> {
  const features: ImageFeatures = await extractImageFeatures(imageDataUrl);

  if (!features.usable) {
    return {
      imageQuality: { usable: false, reason: features.reason },
      selectedGoal: '',
      importance,
      summary: 'Necesitamos ver tu sonrisa un poco mejor.',
      findings: [],
      strengths: [],
      explorationTopics: [],
      requiresProfessionalEvaluation: [],
      limitations: '',
      whatsappSummary: '',
    };
  }

  const apiUrl = `${SUPABASE_URL}/functions/v1/analyze-smile`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ features, selectedGoal, importance }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error en el análisis (${response.status}): ${errorText}`);
  }

  const data = await response.json() as { analysis: SmileAnalysis };

  if (!data.analysis || !data.analysis.imageQuality) {
    throw new Error('Respuesta inválida del servidor');
  }

  return data.analysis;
}

export function buildWhatsAppLink(summary: string): string {
  const encoded = encodeURIComponent(summary);
  return `https://wa.me/51950239644?text=${encoded}`;
}
