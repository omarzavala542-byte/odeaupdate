type VercelRequest = { method?: string; body: unknown };
type VercelResponse = { status: (code: number) => VercelResponse; json: (body: unknown) => VercelResponse; end: () => VercelResponse };

type Features = {
  brightness: number;
  uniformity: number;
  edgeDensity: number;
  symmetryScore: number;
  usable: boolean;
  reason?: string;
};

type RequestBody = {
  image?: unknown;
  selectedGoal?: unknown;
  importance?: unknown;
  features?: Features;
};

const goals: Record<string, string> = {
  whiter: 'Dientes más blancos', alignment: 'Mejor alineación', shape: 'Forma o proporción',
  harmony: 'Sonrisa más armónica', health: 'Salud y limpieza', guide: 'Quiero orientación',
};

function json(res: VercelResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return json(res, 405, { error: 'Método no permitido' });

  try {
    const body = req.body as RequestBody;
    const image = typeof body.image === 'string' ? body.image : '';
    const selectedGoal = typeof body.selectedGoal === 'string' ? body.selectedGoal : '';
    const importance = Number(body.importance);
    const features = body.features;

    if (!image || !selectedGoal || !Number.isInteger(importance) || importance < 1 || importance > 5 || !features) {
      return json(res, 400, { error: 'Solicitud de análisis incompleta' });
    }

    const label = goals[selectedGoal] ?? selectedGoal;
    if (!features.usable) {
      return json(res, 200, { analysis: {
        imageQuality: { usable: false, reason: features.reason ?? 'La fotografía no muestra la sonrisa con suficiente claridad.' },
        selectedGoal: label, importance, summary: 'Necesitamos ver tu sonrisa un poco mejor para darte una orientación útil.',
        findings: [], strengths: [], explorationTopics: [], requiresProfessionalEvaluation: [],
        limitations: 'Toma otra fotografía con buena luz, enfocada y mostrando claramente los dientes.', whatsappSummary: '',
      }});
    }

    const brightness = features.brightness >= 0.5 ? 'luminosa y clara' : 'moderada';
    const uniformity = features.uniformity >= 0.6 ? 'bastante uniforme' : 'con algunas variaciones visibles';
    const balance = features.symmetryScore >= 0.65 ? 'equilibrada' : 'con algunas diferencias visuales';
    const focus: Record<string, [string, string]> = {
      whiter: ['TONO Y LUMINOSIDAD', `La tonalidad aparente se percibe ${brightness} y ${uniformity} entre las piezas visibles.`],
      alignment: ['ALINEACIÓN APARENTE', `El orden visual frontal se percibe ${balance}; la fotografía no permite valorar la mordida.`],
      shape: ['FORMA Y PROPORCIÓN', `Los contornos visibles muestran proporciones generales ${balance}.`],
      harmony: ['ARMONÍA GENERAL', `El conjunto de la sonrisa se percibe ${balance} en esta fotografía.`],
      health: ['APARIENCIA SUPERFICIAL', `La fotografía permite observar una apariencia superficial ${uniformity}, pero no la salud dental.`],
      guide: ['ORIENTACIÓN GENERAL', `La sonrisa muestra una apariencia natural, con un equilibrio visual ${balance}.`],
    };
    const [category, observation] = focus[selectedGoal] ?? focus.guide;
    const summary = `Nos dijiste que quieres conocer más sobre: ${label}. En tu fotografía se aprecia una tonalidad ${brightness} y una apariencia ${uniformity}.`;
    return json(res, 200, { analysis: {
      imageQuality: { usable: true }, selectedGoal: label, importance, summary,
      findings: [{ category, title: 'Lo que observamos en tu fotografía', observation, relevance: 'high' }],
      strengths: [features.symmetryScore >= 0.65 ? 'La sonrisa mantiene una buena naturalidad general' : 'La sonrisa presenta una apariencia general natural'],
      explorationTopics: ['Conversar con un especialista sobre los aspectos observados'],
      requiresProfessionalEvaluation: ['Una valoración presencial permitiría conocer qué alternativas son apropiadas para tu caso'],
      limitations: 'Una fotografía permite observar características estéticas visibles, pero no permite evaluar completamente la salud dental, las encías, la mordida ni las estructuras internas. No constituye un diagnóstico ni prescribe tratamientos.',
      whatsappSummary: summary,
    }});
  } catch (error) {
    console.error('[analyze-smile]', error);
    return json(res, 500, { error: 'No se pudo completar el análisis' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };
