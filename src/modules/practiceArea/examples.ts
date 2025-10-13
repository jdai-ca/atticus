/**
 * Practice Area Module - Example Usage
 * 
 * This file demonstrates practical usage patterns for the practice area module.
 * These examples can be adapted for use in your components.
 */

import {
    detectPracticeArea,
    detectPracticeAreaWithConfidence,
    practiceAreaManager
} from '../practiceArea';

// ============================================================================
// Example 1: Basic Detection in Chat
// ============================================================================

export function exampleBasicDetection() {
    const userMessage = "I need help reviewing a merger agreement for my company";

    // Simple detection
    const area = detectPracticeArea(userMessage);

    console.log(`Detected Area: ${area.name}`);
    console.log(`Color: ${area.color}`);
    console.log(`Description: ${area.description}`);

    // Use the system prompt for AI request
    const systemPrompt = area.systemPrompt;

    return { area, systemPrompt };
}

// ============================================================================
// Example 2: Advanced Detection with Confidence
// ============================================================================

export function exampleAdvancedDetection() {
    const userMessage = "We're facing a wrongful termination lawsuit from a former employee";

    // Get detailed detection results
    const result = detectPracticeAreaWithConfidence(userMessage, {
        includeAlternatives: true,
        maxAlternatives: 3
    });

    console.log('=== Detection Results ===');
    console.log(`Primary Area: ${result.area.name}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`Matched Keywords: ${result.matchedKeywords.join(', ')}`);

    if (result.alternatives && result.alternatives.length > 0) {
        console.log('\nAlternative Matches:');
        result.alternatives.forEach((alt, idx) => {
            console.log(`  ${idx + 1}. ${alt.area.name} - ${(alt.confidence * 100).toFixed(1)}%`);
        });
    }

    return result;
}

// ============================================================================
// Example 3: Custom Practice Area
// ============================================================================

export function exampleCreateCustomArea() {
    // Create a custom Immigration Law practice area
    const immigrationArea = practiceAreaManager.createCustomArea(
        'immigration',
        'Immigration Law',
        [
            'visa', 'green card', 'naturalization', 'asylum', 'deportation',
            'work permit', 'H1B', 'L1', 'EB5', 'USCIS', 'immigration status',
            'citizenship', 'permanent resident', 'refugee', 'removal proceedings'
        ],
        'Immigration and naturalization matters',
        `You are a specialized legal AI assistant focusing on Immigration Law.

**Your Core Competencies:**
- Visa Categories - H1B, L1, O1, E2, tourist, student visas
- Green Card Process - family-based, employment-based, diversity lottery
- Naturalization - citizenship requirements, N-400 applications
- Asylum and Refugee Law - asylum applications, credible fear interviews
- Deportation Defense - removal proceedings, cancellation of removal
- Immigration Court Procedures - EOIR proceedings, appeals to BIA
- Employment Authorization - EAD, work permits, STEM OPT

**Your Approach:**
1. Provide accurate information on immigration procedures and timelines
2. Reference INA (Immigration and Nationality Act) provisions
3. Explain USCIS processes and form requirements
4. Discuss visa eligibility criteria and documentation
5. Address both immigrant and non-immigrant pathways
6. Consider country-specific quotas and processing times

**Important Disclaimers:**
- Immigration law changes frequently - verify current requirements with USCIS
- Processing times vary significantly by USCIS service center
- Immigration decisions have life-changing consequences
- Deportation cases require immediate legal representation
- Always recommend consultation with licensed immigration attorneys
- Forms must be filled accurately - errors can cause denials or delays`,
        '#10b981' // Green color
    );

    console.log(`Created custom area: ${immigrationArea.name}`);

    // Test detection with immigration-related text
    const testMessage = "I need help with my H1B visa extension application";
    const detected = practiceAreaManager.detectArea(testMessage);

    console.log(`Test detection: ${detected.name}`);

    return immigrationArea;
}

// ============================================================================
// Example 4: Customizing Existing Areas
// ============================================================================

export function exampleCustomizeArea() {
    // Get the corporate law area
    const corporate = practiceAreaManager.getAreaById('corporate');

    if (!corporate) return;

    // Add industry-specific keywords
    const enhancedKeywords = [
        ...corporate.keywords,
        'Series A', 'Series B', 'cap table', 'SAFE', 'convertible note',
        'term sheet', 'drag-along rights', 'anti-dilution', 'liquidation preference',
        'founder vesting', 'stock option pool'
    ];

    practiceAreaManager.updateKeywords('corporate', enhancedKeywords);

    // Customize the system prompt for startup focus
    const startupPrompt = `${corporate.systemPrompt}

**Additional Startup-Specific Expertise:**
- Venture Capital Financing - term sheets, SAFE notes, convertible debt
- Founder Agreements - equity splits, vesting schedules, cliff periods
- Cap Table Management - dilution analysis, option pools, preferences
- Startup Corporate Governance - board composition, protective provisions
- Exit Strategies - acquisition terms, liquidation preferences, escrows

When working with startup clients, always consider:
1. Stage of company (pre-seed, seed, Series A, etc.)
2. Founder equity protection and vesting
3. Investor rights and preferences
4. Cap table impact of new financing
5. Exit scenario implications`;

    practiceAreaManager.updateSystemPrompt('corporate', startupPrompt);

    console.log('Enhanced Corporate Law area for startup practice');

    return practiceAreaManager.getAreaById('corporate');
}

// ============================================================================
// Example 5: Managing Practice Areas
// ============================================================================

export function exampleManageAreas() {
    // Get all areas
    const allAreas = practiceAreaManager.getAllAreas();
    console.log(`Total practice areas: ${allAreas.length}`);

    // Get only enabled areas
    const enabled = practiceAreaManager.getEnabledAreas();
    console.log(`Enabled areas: ${enabled.length}`);

    // Disable criminal law (firm doesn't practice in this area)
    practiceAreaManager.setAreaEnabled('criminal', false);
    console.log('Disabled Criminal Law');

    // List enabled areas with keyword counts
    console.log('\n=== Active Practice Areas ===');
    practiceAreaManager.getEnabledAreas().forEach(area => {
        console.log(`${area.name}: ${area.keywords.length} keywords`);
    });

    // Re-enable if needed
    practiceAreaManager.setAreaEnabled('criminal', true);
}

// ============================================================================
// Example 6: Export/Import Configuration
// ============================================================================

export function exampleExportImport() {
    // Export current configuration
    const config = practiceAreaManager.exportConfigs();

    // Save to localStorage
    localStorage.setItem('atticus-practice-areas', JSON.stringify(config));
    console.log('Configuration exported to localStorage');

    // Later, import the configuration
    const savedConfig = localStorage.getItem('atticus-practice-areas');
    if (savedConfig) {
        const configs = JSON.parse(savedConfig);
        practiceAreaManager.importConfigs(configs);
        console.log('Configuration imported from localStorage');
    }

    // Reset to defaults if needed
    // practiceAreaManager.resetToDefaults();

    return config;
}

// ============================================================================
// Example 7: UI Integration - Practice Area Selector
// ============================================================================

export function exampleUIIntegration() {
    // Get all areas for dropdown/selector
    const areas = practiceAreaManager.getEnabledAreas();

    // Create UI options
    const options = areas.map(area => ({
        value: area.id,
        label: area.name,
        description: area.description,
        color: area.color,
        icon: getPracticeAreaIcon(area.id)
    }));

    return options;
}

function getPracticeAreaIcon(areaId: string): string {
    const icons: Record<string, string> = {
        'corporate': '🏢',
        'litigation': '⚖️',
        'intellectual-property': '💡',
        'real-estate': '🏠',
        'employment': '👔',
        'contracts': '📄',
        'criminal': '👨‍⚖️',
        'tax': '💰',
        'general': '📚'
    };

    return icons[areaId] || '⚖️';
}

// ============================================================================
// Example 8: Smart Detection with User Override
// ============================================================================

export function exampleSmartDetection(userMessage: string) {
    // Get detection with alternatives
    const result = detectPracticeAreaWithConfidence(userMessage, {
        includeAlternatives: true,
        maxAlternatives: 2,
        minConfidence: 0.15
    });

    // If confidence is low, offer user a choice
    if (result.confidence < 0.3 && result.alternatives && result.alternatives.length > 0) {
        return {
            shouldPromptUser: true,
            primaryArea: result.area,
            alternatives: result.alternatives.map(alt => alt.area),
            message: 'We detected this might be related to multiple practice areas. Please select the most relevant one:'
        };
    }

    // High confidence - use automatically
    return {
        shouldPromptUser: false,
        selectedArea: result.area,
        confidence: result.confidence
    };
}

// ============================================================================
// Example 9: Batch Detection (for Document Analysis)
// ============================================================================

export function exampleBatchDetection(documents: Array<{ id: string; content: string }>) {
    const results = documents.map(doc => {
        const result = detectPracticeAreaWithConfidence(doc.content, {
            includeAlternatives: false
        });

        return {
            documentId: doc.id,
            practiceArea: result.area.name,
            confidence: result.confidence,
            matchedKeywords: result.matchedKeywords.slice(0, 5) // Top 5 keywords
        };
    });

    // Group by practice area
    const grouped = results.reduce((acc, item) => {
        const area = item.practiceArea;
        if (!acc[area]) acc[area] = [];
        acc[area].push(item);
        return acc;
    }, {} as Record<string, typeof results>);

    console.log('=== Document Analysis ===');
    Object.entries(grouped).forEach(([area, docs]) => {
        console.log(`${area}: ${docs.length} documents`);
    });

    return { results, grouped };
}

// ============================================================================
// Example 10: Real-time Detection as User Types
// ============================================================================

export function exampleRealTimeDetection(currentText: string) {
    // Only detect if there's enough text
    if (currentText.length < 20) {
        return null;
    }

    const result = detectPracticeAreaWithConfidence(currentText, {
        minConfidence: 0.2 // Higher threshold for real-time
    });

    // Return for UI display (e.g., show badge with practice area)
    if (result.confidence > 0.2) {
        return {
            area: result.area.name,
            color: result.area.color,
            confidence: result.confidence
        };
    }

    return null;
}

// ============================================================================
// Example 11: Practice Area Statistics
// ============================================================================

export function exampleStatistics(conversations: Array<{ practiceAreaId: string }>) {
    const stats = conversations.reduce((acc, conv) => {
        const areaId = conv.practiceAreaId;
        acc[areaId] = (acc[areaId] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Sort by usage
    const sorted = Object.entries(stats)
        .map(([areaId, count]) => {
            const area = practiceAreaManager.getAreaById(areaId);
            return {
                areaId,
                name: area?.name || 'Unknown',
                count,
                percentage: (count / conversations.length * 100).toFixed(1)
            };
        })
        .sort((a, b) => b.count - a.count);

    console.log('=== Practice Area Usage Statistics ===');
    sorted.forEach((stat, idx) => {
        console.log(`${idx + 1}. ${stat.name}: ${stat.count} (${stat.percentage}%)`);
    });

    return sorted;
}

// ============================================================================
// Example 12: Complete Chat Integration
// ============================================================================

export async function exampleChatIntegration(
    userMessage: string,
    sendMessageToAI: (message: string, systemPrompt: string) => Promise<string>
) {
    // Step 1: Detect practice area
    const result = detectPracticeAreaWithConfidence(userMessage, {
        includeAlternatives: true
    });

    console.log(`Detected: ${result.area.name} (${(result.confidence * 100).toFixed(1)}% confidence)`);

    // Step 2: Get system prompt
    const systemPrompt = practiceAreaManager.getSystemPrompt(result.area.id);

    if (!systemPrompt) {
        throw new Error('System prompt not found');
    }

    // Step 3: Send to AI with specialized prompt
    const aiResponse = await sendMessageToAI(userMessage, systemPrompt);

    // Step 4: Return response with metadata
    return {
        response: aiResponse,
        practiceArea: {
            id: result.area.id,
            name: result.area.name,
            color: result.area.color
        },
        detectionConfidence: result.confidence,
        matchedKeywords: result.matchedKeywords
    };
}

// ============================================================================
// Export all examples
// ============================================================================

export const examples = {
    basicDetection: exampleBasicDetection,
    advancedDetection: exampleAdvancedDetection,
    createCustomArea: exampleCreateCustomArea,
    customizeArea: exampleCustomizeArea,
    manageAreas: exampleManageAreas,
    exportImport: exampleExportImport,
    uiIntegration: exampleUIIntegration,
    smartDetection: exampleSmartDetection,
    batchDetection: exampleBatchDetection,
    realTimeDetection: exampleRealTimeDetection,
    statistics: exampleStatistics,
    chatIntegration: exampleChatIntegration
};

/**
 * Usage example:
 * @example
 * import { examples } from '@/modules/practiceArea/examples';
 * examples.basicDetection();
 */
