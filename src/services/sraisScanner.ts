/**
 * SRAIS Harm Scanner Service
 *
 * Detects potential harms and risks in legal and business context texts.
 * Multilingual support: EN, FR, ES.
 */

/**
 * SRAIS Harm Scanner Service
 *
 * Detects potential harms and risks in legal and business context texts.
 * Multilingual support: EN, FR, ES.
 */

export type HarmCategory =
  | 'Privacy'
  | 'Financial'
  | 'Legal'
  | 'Regulatory'
  | 'IntellectualProperty'
  | 'Contractual'
  | 'Reputational'
  | 'Violence'
  | 'Hate';

export type SRAISRiskLevel = 'Critical' | 'High-Stakes' | 'Compliance' | 'Low';

export type TargetType = 'Person' | 'Role' | 'Situation' | 'Entity' | 'General';

export interface AnalysisResult {
  originalText: string;
  detectedHarms: HarmCategory[];
  target: {
    type: TargetType;
    value?: string;
  };
  consequences: string[];
  riskLevel: SRAISRiskLevel;
}

export interface SRAISScanResult {
  hasFindings: boolean;
  findings: AnalysisResult[];
}

/**
 * Creates a RegExp with Unicode-aware lookarounds instead of \b (word boundaries)
 * so that accented/diacritic characters in French, Spanish, etc. are matched correctly.
 */
export function createUnicodeBoundaryRegex(patternStr: string): RegExp {
  return new RegExp(`(?<!\\p{L})(?:${patternStr})(?!\\p{L})`, 'ui');
}

/**
 * Tries to decode potential base64, hex, and URL obfuscations inside the input text
 * to ensure malicious users cannot bypass SRAIS scanning.
 * Dual-compatible with browser and node environments.
 */
export function preprocessAndDeobfuscate(text: string): string {
  let processed = text.normalize('NFC');

  // 1. Base64 segments of length >= 16
  const base64Regex = /\b([A-Za-z0-9+/]{16,}={0,2})\b/g;
  let match;
  while ((match = base64Regex.exec(text)) !== null) {
    try {
      const segment = match[1];
      const decoded = atob(segment);
      if (decoded.length > 5 && /[a-zA-Z]{3,}/.test(decoded)) {
        processed += ' ' + decoded;
      }
    } catch {
      // Ignored
    }
  }

  // 2. Hex segments of length >= 16
  const hexRegex = /\b([0-9a-fA-F]{16,})\b/g;
  while ((match = hexRegex.exec(text)) !== null) {
    try {
      const segment = match[1];
      let decoded = '';
      for (let i = 0; i < segment.length; i += 2) {
        const charCode = parseInt(segment.substring(i, i + 2), 16);
        if (isNaN(charCode)) break;
        decoded += String.fromCharCode(charCode);
      }
      if (decoded.length > 5 && /[a-zA-Z]{3,}/.test(decoded)) {
        processed += ' ' + decoded;
      }
    } catch {
      // Ignored
    }
  }

  // 3. URL decoding if heavy URL encoding is detected
  if (/%[0-9A-F]{2}/gi.test(text)) {
    try {
      const decoded = decodeURIComponent(text);
      if (decoded !== text) {
        processed += ' ' + decoded;
      }
    } catch {
      // Ignored
    }
  }

  // 4. ROT13 / Caesar cipher Basic deobfuscation
  if (/[a-zA-Z]/.test(text)) {
    const rot13Decoded = text.replace(/[a-zA-Z]/g, c => {
      const charCode = c.charCodeAt(0);
      const isUpper = charCode >= 65 && charCode <= 90;
      const base = isUpper ? 65 : 97;
      return String.fromCharCode(((charCode - base + 13) % 26) + base);
    });
    processed += ' ' + rot13Decoded;
  }

  // 5. Spaced string deobfuscation (e.g., "b y p a s s")
  // Finds single letters separated by space or non-word characters and recombines them
  const spacedStrRegex = /(?:[a-zA-Z]\s+){2,}[a-zA-Z]/g;
  let spacedMatch;
  while ((spacedMatch = spacedStrRegex.exec(text)) !== null) {
    const despaced = spacedMatch[0].replace(/\s+/g, '');
    if (despaced.length > 3) {
      processed += ' ' + despaced;
    }
  }

  return processed;
}

/**
 * Returns localized instruction guidance based on the highest risk level detected.
 */
export function getSraisActionGuidance(
  riskLevel: SRAISRiskLevel,
  lang: 'en' | 'fr' | 'es' = 'en'
): string {
  switch (riskLevel) {
    case 'Critical':
      if (lang === 'fr') {
        return 'Avertissement critique SRAIS : Cette requête implique des préoccupations de sécurité, de sûreté ou de conformité d’une extrême gravité (ex. falsification de preuves, corruption, haine, violence). Il est fortement déconseillé de soumettre cette requête. Consultez immédiatement votre direction, un avocat ou les autorités compétentes.';
      }
      if (lang === 'es') {
        return 'Advertencia crítica de SRAIS: Esta consulta involucra problemas de seguridad o cumplimiento de extrema gravedad (p. ej., alteración de pruebas, de registros, sobornos, odio, violencia). Se recomienda encarecidamente no enviar esta solicitud. Consulte de inmediato a la dirección de su empresa, un abogado o los canales de cumplimiento correspondientes.';
      }
      return 'SRAIS Critical Warning: This query involves high-severity security, safety, or compliance concerns (such as potential evidence tampering, bribery, violence, or hate). It is strongly advised not to submit this request. Consult executive leadership, senior counsel, or appropriate compliance channels immediately.';

    case 'High-Stakes':
      if (lang === 'fr') {
        return 'Risque juridique majeur : Cette demande est liée à des décisions commerciales ou juridiques hautement sensibles (ex. litiges actifs, rupture de contrat ou faute financière). Les résultats de l’IA dans ce domaine sont purement informatifs. Veuillez impliquer un conseiller juridique agréé ou un avocat spécialisé avant de prendre tout engagement ferme.';
      }
      if (lang === 'es') {
        return 'Riesgo legal de alto impacto: Esta solicitud está relacionada con decisiones comerciales o legales críticas (p. ej., litigios activos, incumplimiento de contrato o conducta financiera inapropiada). Las respuestas de la IA son meramente informativas. Involucre a un abogado calificado o asesores especializados antes de proceder con cualquier acción vinculante.';
      }
      return 'High-Stakes Legal Risk: This prompt relates to critical corporate-legal decisions (such as active litigation, breach of contract, or financial misconduct). AI-generated advice in this space is purely informational. Involve licensed senior legal counsel or highly specialized advisors before proceeding with any binding commitments or actions.';

    case 'Compliance':
      if (lang === 'fr') {
        return 'Risque de conformité réglementaire : Cette demande concerne des directives réglementaires, d’audit d’entreprise ou de conformité des données. Bien que le risque soit modéré, veillez à valider toutes les recommandations de l’IA par rapport aux codes juridiques officiels ou à vos politiques internes.';
      }
      if (lang === 'es') {
        return 'Alineación de cumplimiento regulatorio: Esta consulta aborda pautas de regulación, auditorías corporativas o cumplimiento de datos. Aunque el riesgo es moderado, asegúrese de verificar las sugerencias de la IA con leyes oficiales o manuales internos de políticas de la organización.';
      }
      return "Regulatory Compliance Alignment: This prompt touches on regulatory guidelines, corporate audits, or data compliance. While moderate risk, ensure all AI-derived recommendations are verified against actual legal codes, official regulatory databases, or your organization's formal policy documentation.";

    default:
      return '';
  }
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

/**
 * MULTILINGUAL DICTIONARY (EN, FR, ES)
 * Using Unicode property escape mapping to support accented characters and avoid false positives.
 *
 * Hoisted to module scope: these RegExps carry no match state (no `g`/`y` flags), so they are
 * safe to share across calls. Rebuilding ~30 RegExp objects on every scan was a measurable
 * per-message cost; compiling them once at module load avoids that overhead.
 */
const HARM_MAP: Record<HarmCategory, RegExp> = {
  Financial: createUnicodeBoundaryRegex(
    'bankrupt|bankruptcy|fraud|faillite|fraude|quiebra|misconduct|embezzlement|swindle|bribe|bribery|corruption|' +
      // English compound concealment/tampering of risky targets
      '(?:delete|destroy|erase|hide|conceal|tamper|fabricat(?:e|ed|ion)|falsif(?:y|ied|ication)|obstruct|cover[- ]up|covert|manipulat(?:e|ed|ion)|alter|obscure)\\s+(?:\\w+\\s+){0,5}(?:evidence|records?|files?|documents?|audits?|investigations?|proofs?|misconducts?|briber(?:y|ies)|frauds?|crimes?|ledgers?|ownership|taxes|tax|authorities|accounts?|reports?)\\b' +
      // French compound concealment/tampering of risky targets
      '|(?:supprimer|détruire|effacer|cacher|dissimuler|altérer|falsifier|faire disparaître)\\s+(?:\\w+\\s+){0,5}(?:preuves?|dossiers?|documents?|enregistrements?|audits?|enquêtes?|fraudes?|délits?|registres?|comptes?)' +
      // Spanish compound concealment/tampering of risky targets
      '|(?:eliminar|destruir|borrar|ocultar|esconder|alterar|falsificar|encubrir)\\s+(?:\\w+\\s+){0,5}(?:pruebas?|documentos?|archivos?|registros?|auditorías?|investigaciones?|fraudes?|delitos?|cuentas?)'
  ),
  Legal: createUnicodeBoundaryRegex(
    'sue|lawsuit|litigation|poursuite|procès|litige|demanda|pleito|litigio'
  ),
  Regulatory: createUnicodeBoundaryRegex(
    'regulator|regulatory|fine|penalty|sanction|amende|sanción|multa|pénalité'
  ),
  IntellectualProperty: createUnicodeBoundaryRegex('infringement|contrefaçon|infracción'),
  Contractual: createUnicodeBoundaryRegex('breach|violation|incumplimiento'),
  Reputational: createUnicodeBoundaryRegex(
    'slander|libel|scandal|defamation|diffamation|scandale|calomnie|difamación|escándalo'
  ),
  Privacy: createUnicodeBoundaryRegex(
    'leak|data breach|fuite|filtración|unauthorized disclosure|divulgation non autorisée|divulgación no autorizada'
  ),
  Violence: createUnicodeBoundaryRegex(
    'kill|attack|threat|tuer|attaque|menace|matar|ataque|amenaza|exploiting|cyberattack|hacks?|vulnerabilities'
  ),
  Hate: createUnicodeBoundaryRegex(
    'racist|sexist|slur|raciste|sexiste|insulte|racista|sexista|insulto'
  ),
};

const ROLE_MAP: Record<string, RegExp> = {
  Founder: createUnicodeBoundaryRegex(
    'founder|ceo|entrepreneur|fondateur|fondatrice|fundador|fundadora|emprendedor'
  ),
  Investor: createUnicodeBoundaryRegex(
    'investor|shareholder|vc|investisseur|actionnaire|inversor|accionista'
  ),
  Management: createUnicodeBoundaryRegex(
    'manager|director|executive|cadre|directeur|gerente|directivo'
  ),
  Legal: createUnicodeBoundaryRegex('lawyer|attorney|counsel|avocat|juriste|abogado|asesor'),
  Employee: createUnicodeBoundaryRegex('employee|staff|worker|employé|salarié|empleado|trabajador'),
};

const ENTITY_MAP = createUnicodeBoundaryRegex(
  'inc|corp|ltd|llc|startup|firm|company|société|entreprise|sarl|empresa|sociedad|sl'
);

const SITUATION_MAP: Record<string, RegExp> = {
  M_and_A: createUnicodeBoundaryRegex('merger|acquisition|exit|fusion|rachat|fusión|adquisición'),
  Board: createUnicodeBoundaryRegex('board|committee|conseil|comité|junta'),
  Operations: createUnicodeBoundaryRegex(
    'logistics|supply|production|logistique|logística|cadena de suministro'
  ),
  Digital: createUnicodeBoundaryRegex(
    'online|server|platform|ligne|serveur|plateforme|línea|servidor|plataforma'
  ),
};

const CONSEQUENCE_MAP: Record<string, RegExp> = {
  'Financial Loss': createUnicodeBoundaryRegex('penalty|fine|amende|multa|sanción'),
  'Operational Halt': createUnicodeBoundaryRegex(
    'injunction|stoppage|suspension|injonction|arrêt|mandamiento|paralización'
  ),
  'Personal Liability': createUnicodeBoundaryRegex(
    'personal liability|responsabilité personnelle|responsabilidad personal'
  ),
};

const PRONOUNS_REGEX = createUnicodeBoundaryRegex('i|you|me|je|tu|moi|yo|tú|usted|mí');

/**
 * Educational/template drafting exemption anchor.
 *
 * SECURITY: This pattern requires at least one genuine qualifier word (standard, generic,
 * template, etc.) between the action verb and the subject. A previous version also matched
 * with the qualifier made optional, which meant *any* "write/draft/create a statement/
 * agreement/disclosure" phrasing - a phrasing pattern common to ordinary legal drafting
 * requests - fully bypassed harm detection, including requests that also asked to bribe
 * officials or destroy evidence. Do not weaken the qualifier requirement without also
 * re-verifying that Critical-tier indicators (see hasCriticalIndicator below) can never be
 * suppressed by this exemption.
 */
const EXEMPT_TEMPLATE_REGEX =
  /(?:draft(?:ing)?|creat(?:e|ing)?|describ(?:e|ing)?|writ(?:e|ing)?)\s+(?:a\s+)?(?:(?:standard|generic|template|blank|sample|example|educational|academic|hypothetical|fictional)\s+){1,3}(?:statement|guideline|disclosing|discussions?|articles?|disclosures?|agreements?)/i;

const CORRUPTION_OR_EVIDENCE_TAMPERING_REGEX =
  /corruption|bribe|bribery|subordonner|pot-de-vin|soborno|cohecho|(?:delete|destroy|erase|hide|conceal|tamper|supprimer|altérer|falsifier|eliminar|destruir|ocultar)\s+(?:\w+\s+){0,3}(?:evidence|record|file|document|proof|proofs?|preuve|dossier|archivo|registro)/i;

const CRITICAL_HARM_CATEGORIES: readonly HarmCategory[] = ['Violence', 'Hate'];
const HIGH_STAKES_HARM_CATEGORIES: readonly HarmCategory[] = [
  'Legal',
  'Financial',
  'Contractual',
  'IntellectualProperty',
  'Reputational',
];

/** Defensive cap so a pathological input (e.g. an unbounded API payload) can't force
 * quadratic-feeling work across ~30 regex passes plus obfuscation decoding. */
const MAX_HARM_ANALYSIS_TEXT_LENGTH = 20_000;

export function HarmAnalysis(inputs: string[]): AnalysisResult[] {
  return inputs.map(rawText => {
    const text =
      rawText.length > MAX_HARM_ANALYSIS_TEXT_LENGTH
        ? rawText.slice(0, MAX_HARM_ANALYSIS_TEXT_LENGTH)
        : rawText;
    const processedText = preprocessAndDeobfuscate(text);
    const result: AnalysisResult = {
      originalText: rawText,
      detectedHarms: [],
      target: { type: 'General' },
      consequences: [],
      riskLevel: 'Low',
    };

    // Evaluate exemption anchors: If user is asking for general educational materials, mock drafts or templates description, bypass SRAIS
    const isExempt = EXEMPT_TEMPLATE_REGEX.test(processedText);

    // 1. Detect Harms (always run - exemption only suppresses non-critical categories below)
    for (const [category, regex] of Object.entries(HARM_MAP)) {
      if (regex.test(processedText)) result.detectedHarms.push(category as HarmCategory);
    }

    // 2. Detect Consequences (always run)
    for (const [cons, regex] of Object.entries(CONSEQUENCE_MAP)) {
      if (regex.test(processedText)) result.consequences.push(cons);
    }

    // Critical-tier indicators (violence, hate, bribery, evidence tampering) must never be
    // hidden behind "draft a template/example" framing - only softer categories are exempted.
    const hasCorruptionOrEvidenceTampering = CORRUPTION_OR_EVIDENCE_TAMPERING_REGEX.test(
      processedText
    );
    const hasCriticalIndicator =
      hasCorruptionOrEvidenceTampering ||
      result.detectedHarms.some(h => CRITICAL_HARM_CATEGORIES.includes(h));

    if (isExempt && !hasCriticalIndicator) {
      result.detectedHarms = [];
      result.consequences = [];
    }

    // 3. Determine Framing
    if (ENTITY_MAP.test(processedText)) {
      result.target.type = 'Entity';
    } else {
      for (const [role, regex] of Object.entries(ROLE_MAP)) {
        if (regex.test(processedText)) {
          result.target = { type: 'Role', value: role };
          break;
        }
      }
    }

    if (result.target.type === 'General') {
      for (const [sit, regex] of Object.entries(SITUATION_MAP)) {
        if (regex.test(processedText)) {
          result.target = { type: 'Situation', value: sit };
          break;
        }
      }
    }

    // Fallback for personal pronouns across 3 languages
    if (result.target.type === 'General' && PRONOUNS_REGEX.test(processedText)) {
      result.target.type = 'Person';
    }

    // Estimate highest Risk Level
    let riskLevel: SRAISRiskLevel = 'Low';
    if (hasCriticalIndicator) {
      riskLevel = 'Critical';
    } else if (result.detectedHarms.length > 0) {
      riskLevel = 'Compliance'; // baseline if any harms are detected

      const containsHighStakes = result.detectedHarms.some(h =>
        HIGH_STAKES_HARM_CATEGORIES.includes(h)
      );
      if (containsHighStakes) {
        riskLevel = 'High-Stakes';
      }
    }

    result.riskLevel = riskLevel;

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
