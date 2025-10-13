import { Jurisdiction, JurisdictionInfo } from '../types';

export const JURISDICTIONS: JurisdictionInfo[] = [
    {
        code: 'CA',
        name: 'Canada',
        flag: '🇨🇦',
        description: 'Canadian federal and provincial law',
    },
    {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        description: 'U.S. federal and state law',
    },
    {
        code: 'EU',
        name: 'European Union',
        flag: '🇪🇺',
        description: 'EU regulations and member state law',
    },
];

export function getJurisdictionSystemPromptAppendix(
    jurisdictions: Jurisdiction[]
): string {
    if (!jurisdictions || jurisdictions.length === 0) {
        return '';
    }

    const jurisdictionNames = jurisdictions
        .map((code) => {
            const info = JURISDICTIONS.find((j) => j.code === code);
            return info?.name || code;
        })
        .join(', ');

    if (jurisdictions.length === 1) {
        const info = JURISDICTIONS.find((j) => j.code === jurisdictions[0]);
        return `\n\nIMPORTANT JURISDICTIONAL FOCUS: This query specifically concerns ${info?.name} law. Please focus your analysis exclusively on ${info?.name} legal framework, statutes, regulations, case law, and legal precedents. If aspects of this question involve international law or other jurisdictions, only mention them in the context of how they interact with or affect ${info?.name} law.`;
    } else {
        return `\n\nIMPORTANT JURISDICTIONAL FOCUS: This is a transnational or multi-jurisdictional query involving ${jurisdictionNames}. Please provide a comparative legal analysis addressing:

1. How each jurisdiction (${jurisdictionNames}) approaches this legal issue
2. Key differences in legal frameworks, statutes, and regulations
3. Relevant case law and legal precedents in each jurisdiction
4. Conflicts of law considerations and choice of law principles
5. Harmonization efforts or treaties that may apply across these jurisdictions
6. Practical considerations for operating across these jurisdictions

Structure your response with clear sections for each jurisdiction, followed by a comparative analysis highlighting critical differences and similarities.`;
    }
}
