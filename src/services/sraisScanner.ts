/**
 * SRAIS Harm Scanner Service
 * 
 * Detects potential harms and risks in legal and business context texts.
 * Multilingual support: EN, FR, ES.
 */

export type HarmCategory = 
  | 'Privacy' | 'Financial' | 'Legal' | 'Regulatory' 
  | 'IntellectualProperty' | 'Contractual' | 'Reputational' 
  | 'Violence' | 'Hate';

export type TargetType = 'Person' | 'Role' | 'Situation' | 'Entity' | 'General';

export interface AnalysisResult {
  originalText: string;
  detectedHarms: HarmCategory[];
  target: {
    type: TargetType;
    value?: string;
  };
  consequences: string[];
}

export interface SRAISScanResult {
  hasFindings: boolean;
  findings: AnalysisResult[];
}

export function buildSraisAnalysisMetadata(text: string): { sraisAnalysis?: AnalysisResult[] } {
  const result = sraisScanner.scan(text);
  return result.hasFindings ? { sraisAnalysis: result.findings } : {};
}

export function countSraisDetectedHarms(analyses?: AnalysisResult[]): number {
  if (!analyses?.length) return 0;

  const uniqueHarms = new Set<HarmCategory>();
  for (const analysis of analyses) {
    for (const harm of analysis.detectedHarms) {
      uniqueHarms.add(harm);
    }
  }

  return uniqueHarms.size;
}

export function HarmAnalysis(inputs: string[]): AnalysisResult[] {
  /**
   * MULTILINGUAL DICTIONARY (EN, FR, ES)
   * Using Unicode flag 'u' to handle accents correctly.
   */
  const HARM_MAP: Record<HarmCategory, RegExp> = {
    Financial: /\b(bankrupt|debt|loss|fraud|money|faillite|dette|perte|fraude|argent|quiebra|deuda|pérdida|dinero|misconduct|embezzlement|swindle|bribe|bribery|conceal(?:ed)?|hide(?:n)?|cover[- ]up|tamper|fabricat(?:e|ed|ion)|falsif(?:y|ied|ication)|delete|destroy|erase|obstruct|mislead|manipulat(?:e|ed|ion))\b/ui,
    Legal: /\b(sue|lawsuit|litigation|liability|poursuite|procès|litige|responsabilité|demanda|pleito|litigio|responsabilidad)\b/ui,
    Regulatory: /\b(compliance|fine|penalty|sanction|regulator|regulatory|audit|investigation|oversight|inspection|evidence|bribery|tampering|conformité|amende|sanción|cumplimiento|multa)\b/ui,
    IntellectualProperty: /\b(patent|trademark|copyright|infringement|brevet|marque|contrefaçon|patente|derechos de autor|infracción)\b/ui,
    Contractual: /\b(breach|contract|agreement|nda|violation|contrat|accord|incumplimiento|contrato|acuerdo)\b/ui,
    Reputational: /\b(slander|libel|scandal|defamation|diffamation|scandale|calomnie|difamación|escándalo)\b/ui,
    Privacy: /\b(leak|private|confidential|disclosure|fuite|privé|confidentiel|divulgation|filtración|privado|confidencial)\b/ui,
    Violence: /\b(kill|attack|threat|tuer|attaque|menace|matar|ataque|amenaza)\b/ui,
    Hate: /\b(racist|sexist|slur|raciste|sexiste|insulte|racista|sexista|insulto)\b/ui
  };

  const ROLE_MAP: Record<string, RegExp> = {
    Founder: /\b(founder|ceo|entrepreneur|fondateur|fondatrice|fundador|fundadora|emprendedor)\b/ui,
    Investor: /\b(investor|shareholder|vc|investisseur|actionnaire|inversor|accionista)\b/ui,
    Management: /\b(manager|director|executive|cadre|directeur|gerente|directivo)\b/ui,
    Legal: /\b(lawyer|attorney|counsel|avocat|juriste|abogado|asesor)\b/ui,
    Employee: /\b(employee|staff|worker|employé|salarié|empleado|trabajador)\b/ui
  };

  const ENTITY_MAP = /\b(inc|corp|ltd|llc|startup|firm|company|société|entreprise|sarl|empresa|sociedad|sl)\b/ui;

  const SITUATION_MAP: Record<string, RegExp> = {
    M_and_A: /\b(merger|acquisition|exit|fusion|rachat|fusión|adquisición)\b/ui,
    Board: /\b(board|committee|conseil|comité|junta)\b/ui,
    Operations: /\b(logistics|supply|production|logistique|logística|cadena de suministro)\b/ui,
    Digital: /\b(online|server|platform|ligne|serveur|plateforme|línea|servidor|plataforma)\b/ui
  };

  const CONSEQUENCE_MAP: Record<string, RegExp> = {
    'Financial Loss': /\b(penalty|fine|damages|amende|dommages|multa|daños)\b/ui,
    'Operational Halt': /\b(injunction|stoppage|suspension|injonction|arrêt|mandamiento|paralización)\b/ui,
    'Personal Liability': /\b(personal liability|responsabilité personnelle|responsabilidad personal)\b/ui
  };

  return inputs.map(text => {
    const result: AnalysisResult = {
      originalText: text,
      detectedHarms: [],
      target: { type: 'General' },
      consequences: []
    };

    // 1. Detect Harms
    for (const [category, regex] of Object.entries(HARM_MAP)) {
      if (regex.test(text)) result.detectedHarms.push(category as HarmCategory);
    }

    // 2. Detect Consequences
    for (const [cons, regex] of Object.entries(CONSEQUENCE_MAP)) {
      if (regex.test(text)) result.consequences.push(cons);
    }

    // 3. Determine Framing
    if (ENTITY_MAP.test(text)) {
      result.target.type = 'Entity';
    } else {
      for (const [role, regex] of Object.entries(ROLE_MAP)) {
        if (regex.test(text)) {
          result.target = { type: 'Role', value: role };
          break;
        }
      }
    }

    if (result.target.type === 'General') {
      for (const [sit, regex] of Object.entries(SITUATION_MAP)) {
        if (regex.test(text)) {
          result.target = { type: 'Situation', value: sit };
          break;
        }
      }
    }

    // Fallback for personal pronouns across 3 languages
    if (result.target.type === 'General' && /\b(i|you|me|je|tu|moi|yo|tú|usted|mí)\b/ui.test(text)) {
      result.target.type = 'Person';
    }

    return result;
  });
}

class SRAISScanner {
  scan(text: string): SRAISScanResult {
    // Treat the whole text as one input for now, or split by sentences/paragraphs.
    // For simplicity, running it on the full text.
    const results = HarmAnalysis([text]);
    const result = results[0];
    
    return {
      hasFindings: result.detectedHarms.length > 0 || result.consequences.length > 0,
      findings: result.detectedHarms.length > 0 || result.consequences.length > 0 ? [result] : [],
    };
  }
}

export const sraisScanner = new SRAISScanner();
