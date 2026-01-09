import { PIIResult } from '../types';
import { ConfigLoader } from '../services/config-loader';
import { piiScanner, RiskLevel, Jurisdiction, PIIDetection } from '../services/pii-scanner';
import { SUPPORTED_JURISDICTIONS } from '../config/constants';

export class ContextManager {
    private configLoader: ConfigLoader;

    constructor(configLoader: ConfigLoader) {
        this.configLoader = configLoader;
    }

    public detectPracticeArea(text: string): string | undefined {
        const lowerText = text.toLowerCase();
        const practices = this.configLoader.getAllPractices();

        for (const practice of practices) {
            if (practice.keywords && practice.keywords.some(k => lowerText.includes(k.toLowerCase()))) {
                return practice.name;
            }
        }
        return undefined;
    }

    public detectAdvisoryArea(text: string): string | undefined {
        const lowerText = text.toLowerCase();
        const advisory = this.configLoader.getAllAdvisory();

        for (const area of advisory) {
            if (area.keywords && area.keywords.some(k => lowerText.includes(k.toLowerCase()))) {
                return area.name;
            }
        }
        return undefined;
    }

    public scanForPII(text: string, jurisdictions: string[] = []): PIIResult {
        // Map string[] to Jurisdiction[] type safely, filtering invalid ones if needed
        const validJurisdictions = jurisdictions.filter(j => (SUPPORTED_JURISDICTIONS as readonly string[]).includes(j)) as Jurisdiction[];

        const scanResult = piiScanner.scan(text, validJurisdictions);

        // Map RiskLevel enum to lowercase string for PIIResult
        const mapRiskLevel = (level: RiskLevel): 'low' | 'medium' | 'high' | 'critical' | 'none' => {
            const levelStr = level.toLowerCase();
            if (levelStr === 'moderate') return 'medium';
            return levelStr as 'low' | 'medium' | 'high' | 'critical' | 'none';
        };

        // Map PIIScanner result to our PIIResult type
        return {
            detected: scanResult.hasFindings,
            findings: scanResult.findings.map((f: PIIDetection) => ({
                type: f.type,
                value: f.value,
                riskLevel: f.riskLevel.toLowerCase(),
                description: f.description
            })),
            riskLevel: mapRiskLevel(scanResult.riskLevel),
            summary: scanResult.summary
        };
    }
}
