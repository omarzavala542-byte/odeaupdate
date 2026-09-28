import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ImageFeatures {
  brightness: number;
  contrast: number;
  warmth: number;
  uniformity: number;
  edgeDensity: number;
  symmetryScore: number;
  usable: boolean;
  reason?: string;
}

interface AnalysisRequest {
  features: ImageFeatures;
  selectedGoal: string;
  importance: number;
}

interface SmileAnalysisFinding {
  category: string;
  title: string;
  observation: string;
  relevance: "high" | "medium" | "low";
}

interface SmileAnalysis {
  imageQuality: { usable: boolean; reason?: string };
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

const goalLabels: Record<string, string> = {
  whiter: "Dientes más blancos",
  alignment: "Mejor alineación",
  shape: "Forma o proporción",
  harmony: "Sonrisa más armónica",
  health: "Salud y limpieza",
  guide: "Quiero orientación",
};

const goalFocus: Record<string, string[]> = {
  whiter: ["TONO Y LUMINOSIDAD"],
  alignment: ["ALINEACIÓN APARENTE"],
  shape: ["FORMA Y PROPORCIÓN"],
  harmony: ["ARMONÍA GENERAL", "SIMETRÍA"],
  health: ["TONO Y LUMINOSIDAD", "ENCÍA VISIBLE"],
  guide: ["ARMONÍA GENERAL", "TONO Y LUMINOSIDAD", "FORMA Y PROPORCIÓN"],
};

function describeBrightness(b: number): string {
  if (b < 0.3) return "una tonalidad relativamente oscura";
  if (b < 0.5) return "una tonalidad moderada, intermedia";
  if (b < 0.7) return "una tonalidad luminosa y clara";
  return "una tonalidad muy luminosa, cercana al blanco";
}

function describeUniformity(u: number): string {
  if (u > 0.75) return "muy uniforme entre las piezas visibles";
  if (u > 0.5) return "relativamente uniforme, con variaciones leves";
  if (u > 0.3) return "con algunas diferencias de tono entre piezas";
  return "con variaciones de tonalidad visibles entre algunas piezas";
}

function describeSymmetry(s: number): string {
  if (s > 0.8) return "una simetría visual bastante equilibrada";
  if (s > 0.6) return "una simetría adecuada, con ligeras diferencias";
  if (s > 0.4) return "algunas diferencias de posición entre los lados";
  return "diferencias visibles de posición entre los lados";
}

function describeEdges(e: number): string {
  if (e > 0.15) return "contornos bien definidos";
  if (e > 0.08) return "contornos razonablemente definidos";
  return "contornos suaves, con menor definición de bordes";
}

function buildAnalysis(req: AnalysisRequest): SmileAnalysis {
  const { features: f, selectedGoal, importance } = req;
  const goalLabel = goalLabels[selectedGoal] || selectedGoal;
  const focusCategories = goalFocus[selectedGoal] || ["ARMONÍA GENERAL"];

  if (!f.usable) {
    return {
      imageQuality: { usable: false, reason: f.reason || "La imagen no permite una evaluación adecuada." },
      selectedGoal: goalLabel,
      importance,
      summary: "Necesitamos ver tu sonrisa un poco mejor para darte una orientación útil.",
      findings: [],
      strengths: [],
      explorationTopics: [],
      requiresProfessionalEvaluation: [],
      limitations: "Una fotografía con mejor iluminación y enfoque es necesaria antes de poder realizar una orientación visual.",
      whatsappSummary: "La fotografía no permitió un análisis adecuado.",
    };
  }

  const brightnessDesc = describeBrightness(f.brightness);
  const uniformityDesc = describeUniformity(f.uniformity);
  const symmetryDesc = describeSymmetry(f.symmetryScore);
  const edgeDesc = describeEdges(f.edgeDensity);

  const findings: SmileAnalysisFinding[] = [];
  const strengths: string[] = [];
  const explorationTopics: string[] = [];
  const requiresPro: string[] = [];

  if (focusCategories.includes("TONO Y LUMINOSIDAD")) {
    findings.push({
      category: "TONO Y LUMINOSIDAD",
      title: "Lo que observamos en tono",
      observation: `En tu fotografía se aprecia ${brightnessDesc} en los dientes anteriores visibles. La luminosidad se percibe ${f.brightness < 0.5 ? "moderada" : "favorable"} y el tono aparece ${uniformityDesc}.`,
      relevance: selectedGoal === "whiter" || selectedGoal === "health" ? "high" : "medium",
    });
    if (f.uniformity < 0.5) {
      findings.push({
        category: "TONO Y LUMINOSIDAD",
        title: "Variaciones de tonalidad",
        observation: "Se observan algunas variaciones de tonalidad entre los dientes visibles. Una fotografía no permite determinar la causa de estas diferencias, por lo que una evaluación profesional sería necesaria.",
        relevance: "medium",
      });
      requiresPro.push("Determinar el origen de las diferencias de tonalidad observadas");
    }
    if (selectedGoal === "whiter") {
      explorationTopics.push("explorar cuánto cambio de luminosidad buscas manteniendo un resultado natural");
    }
  }

  if (focusCategories.includes("ALINEACIÓN APARENTE")) {
    findings.push({
      category: "ALINEACIÓN APARENTE",
      title: "Orden visual de los dientes",
      observation: `Los dientes anteriores presentan ${f.symmetryScore > 0.6 ? "un orden visual relativamente uniforme" : "algunas diferencias de posición visibles"}. Se aprecia ${symmetryDesc} entre los lados. La fotografía permite valorar la apariencia frontal, pero no permite conocer completamente la mordida.`,
      relevance: selectedGoal === "alignment" ? "high" : "medium",
    });
    if (selectedGoal === "alignment") {
      explorationTopics.push("revisar presencialmente pequeñas diferencias de posición");
      requiresPro.push("Evaluar si existe algo que convenga corregir y conocer las alternativas");
    }
  }

  if (focusCategories.includes("FORMA Y PROPORCIÓN")) {
    findings.push({
      category: "FORMA Y PROPORCIÓN",
      title: "Proporciones de los dientes",
      observation: `Las proporciones generales de los dientes anteriores se perciben ${f.symmetryScore > 0.6 ? "bastante equilibradas" : "con ligeras diferencias de contorno"}. Se observa ${edgeDesc} en los bordes visibles.`,
      relevance: selectedGoal === "shape" ? "high" : "medium",
    });
    if (selectedGoal === "shape") {
      explorationTopics.push("evaluar cómo las proporciones influyen en la armonía general");
    }
  }

  if (focusCategories.includes("ARMONÍA GENERAL") || focusCategories.includes("SIMETRÍA")) {
    findings.push({
      category: "ARMONÍA GENERAL",
      title: "Equilibrio visual de la sonrisa",
      observation: `Tu sonrisa mantiene ${f.symmetryScore > 0.7 ? "una apariencia natural y un equilibrio visual bastante homogéneo" : "una apariencia natural con algunas diferencias visuales"}. El conjunto está influido por la relación entre posición, proporción y luminosidad de los dientes anteriores.`,
      relevance: selectedGoal === "harmony" || selectedGoal === "guide" ? "high" : "medium",
    });
    if (selectedGoal === "harmony") {
      explorationTopics.push("identificar qué pequeños cambios tendrían mayor impacto sin perder naturalidad");
    }
  }

  if (focusCategories.includes("ENCÍA VISIBLE")) {
    findings.push({
      category: "ENCÍA VISIBLE",
      title: "Apariencia superficial",
      observation: "En las superficies visibles la sonrisa presenta una apariencia general limpia. Sin embargo, esta fotografía no permite identificar correctamente caries, sarro, inflamación u otras condiciones clínicas.",
      relevance: selectedGoal === "health" ? "high" : "low",
    });
    if (selectedGoal === "health") {
      requiresPro.push("Evaluar el estado real de salud de dientes y encías");
      explorationTopics.push("conversar sobre hábitos de cuidado y frecuencia de evaluación profesional");
    }
  }

  if (f.symmetryScore > 0.65) strengths.push("La sonrisa mantiene una buena naturalidad general");
  if (f.brightness > 0.5) strengths.push("La luminosidad de los dientes visibles es favorable");
  if (f.uniformity > 0.6) strengths.push("La tonalidad se percibe uniforme entre las piezas principales");
  if (f.edgeDensity > 0.1) strengths.push("Los contornos de los dientes se aprecian con claridad");
  if (strengths.length === 0) strengths.push("La sonrisa presenta una apariencia general equilibrada");

  if (selectedGoal === "guide") {
    findings.push({
      category: "ORIENTACIÓN GENERAL",
      title: "Tu principal fortaleza visual",
      observation: `En tu fotografía destaca principalmente ${f.symmetryScore > 0.65 ? "una apariencia natural y una buena continuidad visual" : "una apariencia natural con espacio para explorar mejoras"} entre los dientes anteriores. Si estás buscando una mejora estética sin tener todavía un objetivo definido, luminosidad, proporción y armonía pueden ser buenos temas para conversar con un profesional.`,
      relevance: "high",
    });
    explorationTopics.push("conversar sobre luminosidad, proporción y armonía con un profesional");
  }

  if (explorationTopics.length === 0) {
    explorationTopics.push("conversar con un especialista sobre los aspectos observados");
  }
  if (requiresPro.length === 0) {
    requiresPro.push("Una valoración presencial permitiría conocer qué alternativas son apropiadas para tu caso");
  }

  const summaryParts: string[] = [];
  summaryParts.push(`Nos dijiste que quieres conocer más sobre: ${goalLabel}.`);
  summaryParts.push(`Importancia para ti: ${importance}/5.`);
  summaryParts.push(`En tu fotografía se aprecia ${brightnessDesc} y ${uniformityDesc}.`);

  const summary = summaryParts.join(" ");

  const limitations = "Una fotografía nos permite observar características estéticas visibles, pero no permite evaluar completamente la salud dental, las encías, la mordida ni las estructuras internas. Para conocer qué opciones son realmente apropiadas para tu caso es necesaria una evaluación profesional.";

  const whatsappSummary = `Hola ODEA 👋\n\nRealicé mi Smile Check.\n\nQuise conocer más sobre:\n${goalLabel}\n\nImportancia para mí:\n${importance}/5\n\nResumen de mi orientación:\n${summary}\n\nMe gustaría recibir una evaluación más detallada y conocer qué opciones podrían ser apropiadas para mi sonrisa.`;

  return {
    imageQuality: { usable: true },
    selectedGoal: goalLabel,
    importance,
    summary,
    findings: findings.slice(0, 4),
    strengths: strengths.slice(0, 3),
    explorationTopics: explorationTopics.slice(0, 3),
    requiresProfessionalEvaluation: requiresPro.slice(0, 3),
    limitations,
    whatsappSummary,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: AnalysisRequest = await req.json();

    if (!body.features || !body.selectedGoal) {
      return new Response(
        JSON.stringify({ error: "Faltan parámetros requeridos (features, selectedGoal)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const analysis = buildAnalysis(body);

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
