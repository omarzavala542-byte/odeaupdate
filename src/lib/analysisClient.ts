import type { Goal, ImageFeatures, SmileAnalysis } from '@/types';
import { extractImageFeatures } from '@/lib/imageFeatures';

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

  const response = await fetch('/api/analyze-smile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl, features, selectedGoal, importance }),
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
