import { Jurisdiction, JurisdictionInfo } from '../types';

export const JURISDICTIONS: JurisdictionInfo[] = [
    {
        code: 'CA',
        name: 'Canada',
        flag: '🇨🇦',
        description: 'Canadian federal and provincial law, including interprovincial trade and regulatory differences',
        coverage: 80,
    },
    {
        code: 'US',
        name: 'United States',
        flag: '🇺🇸',
        description: 'U.S. federal and state law, including interstate commerce and jurisdictional conflicts',
        coverage: 92,
    },
    {
        code: 'MX',
        name: 'Mexico',
        flag: '🇲🇽',
        description: 'Mexican federal and state law, including interstate commerce and regulatory variations',
        coverage: 70,
    },
    {
        code: 'EU',
        name: 'European Union',
        flag: '🇪🇺',
        description: 'EU regulations and member state law, including cross-border harmonization',
        coverage: 75,
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

    // Check if this is a CUSMA/USMCA query (Canada + US + Mexico)
    const isCUSMA = jurisdictions.includes('CA') && jurisdictions.includes('US') && jurisdictions.includes('MX');
    const cusmaNote = isCUSMA
        ? '\n\nNOTE: This query involves all three CUSMA/USMCA (Canada-United States-Mexico Agreement) countries. Consider trade agreements, cross-border business regulations, and harmonization efforts under CUSMA where relevant to the legal analysis.'
        : '';

    if (jurisdictions.length === 1) {
        const info = JURISDICTIONS.find((j) => j.code === jurisdictions[0]);
        const code = jurisdictions[0];

        // Add jurisdiction-specific internal complexity guidance
        let internalComplexity = '';

        if (code === 'CA') {
            internalComplexity = '\n\nIMPORTANT - CANADIAN INTERPROVINCIAL CONSIDERATIONS: Canada has significant provincial/territorial variations in law. When relevant, address:\n- Provincial vs. federal jurisdiction (division of powers under Constitution Act, 1867)\n- Interprovincial trade barriers (Agreement on Internal Trade / Canadian Free Trade Agreement)\n- Provincial regulatory differences (securities, employment standards, professional licensing)\n- Conflicts between provincial laws and forum shopping considerations\n- Key provincial variations: Quebec (civil law), Ontario (common law commercial hub), BC, Alberta differences\n- Provincial incorporation vs. federal incorporation (CBCA vs. provincial business corporations acts)';
        } else if (code === 'US') {
            internalComplexity = '\n\nIMPORTANT - U.S. INTERSTATE CONSIDERATIONS: The United States has significant state-by-state variations in law. When relevant, address:\n- Federal vs. state jurisdiction (Commerce Clause, Supremacy Clause, federalism principles)\n- Interstate commerce and dormant Commerce Clause restrictions on state laws\n- State regulatory differences (corporate law, employment, professional licensing, taxation)\n- Conflicts of law and choice of law provisions (which state\'s law applies)\n- Key state variations: Delaware (corporate law), California (employment/consumer protection), New York (finance), Texas (business-friendly)\n- State incorporation considerations and nexus for taxation/regulation';
        } else if (code === 'MX') {
            internalComplexity = '\n\nIMPORTANT - MEXICAN INTERSTATE CONSIDERATIONS: Mexico has federal and state-level legal variations. When relevant, address:\n- Federal vs. state jurisdiction under Mexican Constitution\n- Interstate commerce and regulatory coordination between states\n- State regulatory differences (taxation, labor, commercial regulations)\n- Key state variations: Mexico City (financial hub), Nuevo León (manufacturing), Jalisco (tech)\n- Border states (special regulations for northern border zone)\n- State incorporation vs. federal considerations';
        }

        return `\n\nIMPORTANT JURISDICTIONAL FOCUS: This query specifically concerns ${info?.name} law. Please focus your analysis exclusively on ${info?.name} legal framework, statutes, regulations, case law, and legal precedents. If aspects of this question involve international law or other jurisdictions, only mention them in the context of how they interact with or affect ${info?.name} law.${internalComplexity}`;
    } else {
        // Add guidance for specific jurisdiction combinations
        let combinationGuidance = '';

        // Check for multiple CUSMA countries (any combination of CA, US, MX)
        const cusmaCountries = jurisdictions.filter(j => ['CA', 'US', 'MX'].includes(j));
        const hasCUSMACountries = cusmaCountries.length >= 2;

        if (hasCUSMACountries) {
            combinationGuidance += '\n\nCROSS-BORDER TRADE CONSIDERATIONS: This query involves CUSMA/USMCA region countries. Address:\n- CUSMA/USMCA trade agreement provisions and rules of origin\n- Cross-border regulatory harmonization and mutual recognition\n- Interstate/interprovincial barriers within each country affecting cross-border operations\n- Customs and border procedures between jurisdictions\n- Professional mobility and credential recognition';
        }

        // Check if Canada is included (interprovincial complexity)
        if (jurisdictions.includes('CA')) {
            combinationGuidance += '\n\nCANADIAN INTERPROVINCIAL COMPLEXITY: For Canadian aspects:\n- Provincial regulatory differences and interprovincial trade barriers (CFTA)\n- Division of powers (federal vs. provincial jurisdiction)\n- Quebec civil law vs. common law provinces\n- Provincial securities regulation (no national regulator)';
        }

        // Check if US is included (interstate complexity)
        if (jurisdictions.includes('US')) {
            combinationGuidance += '\n\nU.S. INTERSTATE COMPLEXITY: For U.S. aspects:\n- State-by-state regulatory variations and compliance requirements\n- Interstate commerce regulations and dormant Commerce Clause\n- State incorporation considerations (Delaware dominance)\n- Nexus requirements for taxation and regulation across states';
        }

        // Check if Mexico is included (interstate complexity)
        if (jurisdictions.includes('MX')) {
            combinationGuidance += '\n\nMEXICAN INTERSTATE COMPLEXITY: For Mexican aspects:\n- Federal vs. state jurisdiction and regulatory coordination\n- State-level variations in taxation and labor regulations\n- Border states special regulations (northern border zone)\n- Interstate commerce and regulatory harmonization efforts';
        }

        return `\n\nIMPORTANT JURISDICTIONAL FOCUS: This is a transnational or multi-jurisdictional query involving ${jurisdictionNames}. Please provide a comparative legal analysis addressing:

1. How each jurisdiction (${jurisdictionNames}) approaches this legal issue
2. Key differences in legal frameworks, statutes, and regulations
3. Relevant case law and legal precedents in each jurisdiction
4. Conflicts of law considerations and choice of law principles
5. Harmonization efforts or treaties that may apply across these jurisdictions
6. Practical considerations for operating across these jurisdictions
7. Internal jurisdictional complexities (provincial/state/interstate variations within each country)

Structure your response with clear sections for each jurisdiction, followed by a comparative analysis highlighting critical differences and similarities.${cusmaNote}${combinationGuidance}`;
    }
}
