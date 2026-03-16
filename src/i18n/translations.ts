export type Language = 'en' | 'fr' | 'es';

export interface Translations {
    // Header
    appTitle: string;
    appSubtitle: string;
    providersConfigured: string;
    provider: string;
    providers: string;
    viewLogs: string;
    settings: string;

    // Footer
    disclaimer: string;

    // Sidebar
    newConversation: string;
    conversations: string;
    search: string;
    searchConversations: string;
    noConversationsFound: string;
    messages: string;
    deleteConversation: string;
    confirmDelete: string;
    cancel: string;
    delete: string;

    // Chat Window
    startConversation: string;
    typeYourMessage: string;
    sendMessage: string;
    attachFile: string;
    you: string;
    atticus: string;
    exportToPDF: string;
    copyToClipboard: string;
    addTag: string;

    // Configuration Dialog
    threadConfiguration: string;
    selectModels: string;
    selectJurisdictions: string;
    practiceArea: string;
    advisoryArea: string;
    maxTokens: string;
    done: string;
    close: string;

    // Settings
    providerSettings: string;
    addProvider: string;
    editProvider: string;
    providerName: string;
    apiKey: string;
    baseURL: string;
    model: string;
    save: string;

    // Jurisdictions
    unitedStates: string;
    canada: string;
    unitedKingdom: string;
    europeanUnion: string;
    australia: string;

    // Practice Areas
    corporateLaw: string;
    contractLaw: string;
    intellectualProperty: string;
    employmentLaw: string;
    realEstate: string;
    litigation: string;
    compliance: string;

    // Advisory Areas
    strategicPlanning: string;
    riskManagement: string;
    operations: string;
    finance: string;
    humanResources: string;
    marketing: string;

    // Common
    loading: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    yes: string;
    no: string;
    ok: string;

    // Cost/Usage
    totalCost: string;
    inputTokens: string;
    outputTokens: string;
    totalTokens: string;
    costLedger: string;

    // Export
    exportConversation: string;
    exportMessage: string;
    exportAll: string;

    // Privacy
    privacyWarning: string;
    piiDetected: string;
    continueAnyway: string;

    // Errors
    apiError: string;
    connectionError: string;
    unexpectedError: string;

    // File Upload
    uploadFile: string;
    fileAttached: string;
    removeFile: string;

    // Actions
    edit: string;
    resend: string;
    retry: string;
    inspect: string;

    // Settings Component
    settingsTabs: {
        providers: string;
        practice: string;
        advisory: string;
        analysis: string;
        privacy: string;
        about: string;
    };

    // Settings - Providers
    settingsProviders: {
        resetToDefaults: string;
        enterApiKey: string;
        pasteApiKeyHere: string;
        removeProviderConfirmation: string;
        azureResourceNameRequired: string;
        invalidApiKey: string;
        getApiKey: string;
        providerConfiguration: string;
        selectModel: string;
        endpoint: string;
        temperature: string;
        domains: string;
        practiceOnly: string;
        advisoryOnly: string;
        bothPracticeAdvisory: string;
        introText: string;
        update: string;
        activate: string;
        removeApiKey: string;
        resetting: string;
        reset: string;
        editConfiguration: string;
        customize: string;
        saveChanges: string;
    };

    // Settings - Practice/Advisory
    settingsAreas: {
        areaName: string;
        areaDescription: string;
        areaId: string;
        newArea: string;
        newAreaDescription: string;
        deleteArea: string;
        pickColor: string;
        areaColor: string;
        enabled: string;
        disabled: string;
        keywords: string;
        addKeyword: string;
        addKeywordPlaceholder: string;
        systemPrompt: string;
        systemPromptPlaceholder: string;
        editYaml: string;
        backToList: string;
        loadFromFile: string;
        saveChanges: string;
        discardChanges: string;
        showMore: string;
        showLess: string;
    };

    // Settings - Analysis
    settingsAnalysis: {
        analysisConfiguration: string;
        systemPromptLabel: string;
        systemPromptPlaceholder: string;
        emptyPromptError: string;
        usedWhen: string;
        resetComplete: string;
        whatIsResponseAnalysis: string;
        responseAnalysisDescription: string;
        keyAnalysisCriteria: string;
        consistencyDescription: string;
        accuracyDescription: string;
        completenessDescription: string;
        qualityRankingDescription: string;
        recommendationsDescription: string;
        customizationNote: string;
        customizationDescription: string;
        critical: string;
    };

    // Settings - Privacy
    settingsPrivacy: {
        privacyConfiguration: string;
        piiScanningEnabled: string;
        auditLoggingEnabled: string;
        dataRetention: string;
        jurisdiction: string;
        selectJurisdiction: string;
    };

    // Settings - About
    settingsAbout: {
        aboutAtticus: string;
        version: string;
        license: string;
        copyright: string;
        documentation: string;
        support: string;
    };

    // Alerts & Notifications
    alerts: {
        configureProviderFirst: string;
        exportFailed: string;
        exportSuccess: string;
        saveFailed: string;
        saveSuccess: string;
        invalidApiKey: string;
        resetSuccess: string;
        resetFailed: string;
        emptyPrompt: string;
        unknownError: string;
        loadFailed: string;
        deleteFailed: string;
        deleteSuccess: string;
        configurationReset: string;
        enterAzureResourceName: string;
        factoryResetCancelled: string;
        validationErrors: string;
    };

    // Cost Reporting
    costReport: {
        total: string;
        input: string;
        output: string;
        tokens: string;
        milliseconds: string;
        duration: string;
        costBreakdown: string;
        usageDetails: string;
    };

    // Tags
    tags: {
        addTag: string;
        removeTag: string;
        createNew: string;
        searchTags: string;
        tagCategory: string;
        contentType: string;
        priority: string;
        status: string;
        noTagsFound: string;
    };

    // Privacy & PII
    privacyDialog: {
        title: string;
        piiDetectedMessage: string;
        continueButton: string;
        cancelButton: string;
        viewDetails: string;
        hideDetails: string;
        detectedItems: string;
        riskLevel: string;
        high: string;
        medium: string;
        low: string;
    };

    // API Error Inspector
    apiInspector: {
        title: string;
        errorDetails: string;
        errorCode: string;
        httpStatus: string;
        message: string;
        request: string;
        response: string;
        headers: string;
        body: string;
        timestamp: string;
    };

    // Log Viewer
    logViewer: {
        title: string;
        filters: string;
        level: string;
        component: string;
        search: string;
        clear: string;
        export: string;
        noLogsFound: string;
        showingLogs: string;
    };

    // File Upload
    fileUpload: {
        uploadFailed: string;
        uploadComplete: string;
        processingFile: string;
        highRiskFileDetected: string;
        securityRating: string;
        threatLevel: string;
        detectedIssues: string;
        warningPrefix: string;
        proceedAnyway: string;
    };

    // ChatWindow
    chatWindow: {
        welcomeTitle: string;
        welcomeSubtitle: string;
        addTag: string;
        inspectError: string;
        resendMessage: string;
        exportPDF: string;
        manageTags: string;
        analyzeResponseCluster: string;
        selectModel: string;
        runAnalysis: string;
        noSelection: string;
        single: string;
        multiple: string;
        globalLegalAnalysis: string;
        focusedAnalysis: string;
        comparativeAnalysis: string;
    };

    // Settings - Additional
    settingsAdditional: {
        loadingAdvisoryAreas: string;
        apiKeysNeverLeave: string;
        piiScanner: string;
        legalProtectionWarning: string;
        highRisk: string;
        totalPatterns: string;
        importantPrivacyInfo: string;
        addNewArea: string;
        consistency: string;
        accuracy: string;
        completeness: string;
        qualityRanking: string;
        recommendations: string;
    };

    // Settings - Comprehensive
    settingsContent: {
        // Providers Tab
        practice: string;
        practiceOnly: string;
        advisory: string;
        advisoryOnly: string;
        both: string;
        configureModelNote: string;
        viewTemplates: string;
        addProvider: string;
        needHelp: string;
        apiKeysStoredSecurely: string;
        configureMultipleProviders: string;
        apiCallsDirect: string;
        incurCostsDirectly: string;
        configured: string;
        active: string;
        defaultModel: string;
        availableModels: string;
        selectDefaultModel: string;
        enableModel: string;
        useFor: string;
        azureResourceName: string;
        resourceNamePlaceholder: string;
        getYourApiKey: string;
        setAsActiveProvider: string;
        confirmResetFactory: string;

        // Practice Tab
        practiceAreasDetection: string;
        legalPracticeAreasCoverage: string;
        specializedPracticeAreas: string;
        automaticAreaDetection: string;
        coversLegalDomains: string;

        // Advisory Tab
        advisoryCapabilities: string;
        businessAdvisoryCoverage: string;
        specializedAdvisoryAreas: string;
        automaticTopicDetection: string;
        coversAdvisoryDomains: string;
        complementsLegalAreas: string;

        // Analysis Tab
        updateAvailable: string;
        dismiss: string;
        responseAnalysisConfig: string;
        configureAnalysisPrompt: string;
        analysisSystemPrompt: string;
        definesAnalysis: string;
        currentConfiguration: string;
        sourceAnalysisYaml: string;
        configuredPromptInfo: string;
        usedWhen: string;
        whatIsResponseAnalysis: string;
        responseAnalysisExplanation: string;
        keyAnalysisCriteria: string;
        consistencyCheck: string;
        accuracyCheck: string;
        completenessCheck: string;
        qualityRankingCheck: string;
        recommendationsCheck: string;
        customizationNote: string;
        customizationExplanation: string;
        configurationLoadError: string;

        // About Tab
        copyright: string;
        copyrightVersion: string;
        europe: string;
        coverage: string;
        ourMission: string;
        missionStatement: string;
        globalCoverage: string;
        globalCoverageDescription: string;
        comprehensiveCapabilities: string;
        legalPracticeAreas: string;
        corporateBusinessLaw: string;
        intellectualProperty: string;
        employmentLaborLaw: string;
        startupEntrepreneurship: string;
        ventureCapitalFinance: string;
        crossBorderOperations: string;
        privacyDataProtection: string;
        andMoreAreas: string;
        businessAdvisoryAreas: string;
        strategicPlanning: string;
        financialAdvisory: string;
        marketingStrategy: string;
        governmentRelations: string;
        productLegalCompliance: string;
        maAdvisory: string;
        digitalTransformation: string;
        totalExpertiseCoverage: string;
        specializedAreas: string;
        dualMode: string;
        builtForStartups: string;
        startupOptimization: string;
        ideaStage: string;
        entityFormation: string;
        seedStage: string;
        fundraising: string;
        growthStage: string;
        scaling: string;
        exitStage: string;
        maIpo: string;
        privacyFirst: string;
        allDataLocal: string;
        apiCallsDirectNoIntermed: string;
        fullDataControl: string;
        importantDisclaimer: string;
        disclaimerText: string;
        systemStatistics: string;
        totalPracticeAreas: string;
        totalAdvisoryAreas: string;
        totalKeywords: string;
        supportedProviders: string;
        providersAvailableConfigured: string;
        builtWith: string;
        reactTypescript: string;
        electronApp: string;
        tailwindCss: string;
        multiProviderAi: string;

        // Privacy Tab
        piiScanningTitle: string;
        piiScanningDescription: string;
        alwaysEnabled: string;
        automaticallyScans: string;
        legalProtectionFull: string;
        scannerCoverage: string;
        critical: string;
        moderate: string;
        highRisk: string;
        totalPatterns: string;
        whatGetsDetected: string;
        examplesOfSensitiveData: string;
        criticalRisk: string;
        usSsn: string;
        canadianSin: string;
        mexicanCurp: string;
        mexicanRfc: string;
        euUkNationalId: string;
        creditCards: string;
        passwordsCredentials: string;
        apiKeysTokens: string;
        highRiskCategory: string;
        ibanAccounts: string;
        clabeCodes: string;
        canadianHealthCard: string;
        euVatNumbers: string;
        passportNumbers: string;
        emailAddresses: string;
        phoneNumbers: string;
        bankAccounts: string;
        usRoutingNumbers: string;
        canadianTransitNumbers: string;
        swiftBicCodes: string;
        medicalRecordNumbers: string;
        moderateRisk: string;
        driversLicense: string;
        taxIdsEins: string;
        legalCaseNumbers: string;
        streetAddresses: string;
        zipPostalCodes: string;
        ipAddresses: string;
        fullNamesWithTitles: string;
        patternsNote: string;
        patterns: string;
        importantPrivacyInfoTitle: string;
        detectionLocal: string;
        scannerWarningsOnly: string;
        userResponsibility: string;
        reviewProviderPolicies: string;
        useExampleData: string;
        noDataCollection: string;

        // YAML Editor
        editConfiguration: string;
        editAnalysisPrompt: string;
        editInstructions: string;
        analysisPromptLabel: string;
        characterCount: string;
        yamlEditInstructions: string;
        idReadOnly: string;
        name: string;
        description: string;
        color: string;
        systemPrompt: string;
        systemPromptHelp: string;
        keywords: string;
        noKeywordsYet: string;
        addKeyword: string;
        deleteArea: string;
        collapse: string;
        expand: string;
        file: string;
        addNewArea: string;
    };

    // Conversation Cost Ledger
    conversationCostLedger: {
        title: string;
        conversation: string;
        totalSpent: string;
        breakdown: string;
        byProvider: string;
        byModel: string;
        byDate: string;
        details: string;
    };

    // Time & Date
    time: {
        justNow: string;
        minuteAgo: string;
        minutesAgo: string;
        hourAgo: string;
        hoursAgo: string;
        dayAgo: string;
        daysAgo: string;
        weekAgo: string;
        weeksAgo: string;
        monthAgo: string;
        monthsAgo: string;
        yearAgo: string;
        yearsAgo: string;
    };
}

// Shared settingsContent (English) used as fallback for other languages
const settingsContentEn = {
    practice: '⚖️ Practice',
    practiceOnly: 'Practice areas only',
    advisory: '💼 Advisory',
    advisoryOnly: 'Advisory areas only',
    both: '🔄 Both',
    configureModelNote: 'Configure each model for practice areas (legal), advisory areas (business consulting), or both. This allows you to optimize specific models for their strengths.',
    viewTemplates: 'View Available Provider Templates',
    addProvider: 'Add New AI Provider',
    needHelp: 'Need Help?',
    apiKeysStoredSecurely: '• Your API keys are stored securely on your local machine',
    configureMultipleProviders: '• You can configure multiple providers and switch between them',
    apiCallsDirect: '• All API calls are made directly to the providers - no intermediaries',
    incurCostsDirectly: '• You incur costs directly with each provider based on usage',
    practiceAreasDetection: 'Atticus automatically detects the practice area based on your conversation content. Here are the configured practice areas:',
    legalPracticeAreasCoverage: 'Legal Practice Areas Coverage',
    specializedPracticeAreas: 'specialized practice areas with',
    automaticAreaDetection: '• Automatic area detection and context-aware legal guidance',
    coversLegalDomains: '• Covers corporate law, IP, employment, contracts, compliance, privacy, and more',
    advisoryCapabilities: 'Atticus provides comprehensive business advisory capabilities to complement legal services. The system automatically detects advisory topics and adjusts guidance accordingly.',
    businessAdvisoryCoverage: 'Business Advisory Coverage',
    specializedAdvisoryAreas: 'specialized advisory areas with',
    automaticTopicDetection: '• Automatic topic detection and context-aware guidance',
    coversAdvisoryDomains: '• Covers strategy, finance, marketing, operations, HR, technology, risk, sustainability, and M&A',
    complementsLegalAreas: '• Complements legal practice areas for comprehensive business support',
    updateAvailable: 'Update Available',
    dismiss: 'Dismiss',
    responseAnalysisConfig: '🔍 Response Analysis Configuration',
    configureAnalysisPrompt: 'Configure the system prompt used for multi-model response validation and analysis. This prompt guides the AI quality analyst when comparing responses from different models.',
    analysisSystemPrompt: 'Analysis System Prompt',
    definesAnalysis: 'Defines how AI models analyze and compare responses for consistency, accuracy, and quality.',
    currentConfiguration: 'Current Configuration',
    sourceAnalysisYaml: 'Source: analysis.yaml',
    configuredPromptInfo: '[Configured system prompt for response analysis]',
    usedWhen: 'Used when: User clicks "Analyze Response Cluster" to compare multiple AI responses using an independent model.',
    whatIsResponseAnalysis: '💡 What is Response Analysis?',
    responseAnalysisExplanation: 'When you receive responses from multiple AI models, you can use an independent "judge" model to analyze and compare them. The analysis system prompt guides this judge model to evaluate consistency, accuracy, completeness, and quality of the responses.',
    keyAnalysisCriteria: 'Key Analysis Criteria',
    consistencyCheck: '1. Consistency: Are the responses aligned with each other?',
    accuracyCheck: '2. Accuracy: Identify potential inaccuracies or confabulations',
    completenessCheck: '3. Completeness: What important points are missing?',
    qualityRankingCheck: '4. Quality Ranking: Rank responses from best to worst',
    recommendationsCheck: '5. Recommendations: Which response(s) to trust most',
    customizationNote: '⚠️ Customization Note',
    customizationExplanation: 'The analysis prompt can be customized to emphasize specific criteria relevant to your use case (e.g., legal accuracy, technical precision, business viability). Click "Customize" to edit the system prompt in a structured editor.',
    copyright: 'Copyright © 2025, John Kost, All Rights Reserved',
    ourMission: '🎯 Our Mission',
    missionStatement: 'Atticus aims to democratize access to high-quality legal and business advisory services by combining artificial intelligence with comprehensive domain expertise. We believe that entrepreneurs, startups, and businesses of all sizes deserve sophisticated legal and strategic guidance to navigate today\'s complex regulatory and business landscape.',
    globalCoverage: '🌍 Global Coverage',
    globalCoverageDescription: 'Atticus provides specialized support for startups and businesses operating in:',
    comprehensiveCapabilities: '⚡ Comprehensive Capabilities',
    legalPracticeAreas: 'Legal Practice Areas',
    corporateBusinessLaw: '• Corporate & Business Law',
    intellectualProperty: '• Intellectual Property',
    employmentLaborLaw: '• Employment & Labor Law',
    startupEntrepreneurship: '• Startup & Entrepreneurship',
    ventureCapitalFinance: '• Venture Capital Finance',
    crossBorderOperations: '• Cross-Border Operations',
    privacyDataProtection: '• Privacy & Data Protection',
    andMoreAreas: '• And 60 more specialized areas',
    businessAdvisoryAreas: 'Business Advisory Areas',
    strategicPlanning: '• Strategic Planning & Business Strategy',
    financialAdvisory: '• Financial Advisory & Corporate Finance',
    marketingStrategy: '• Marketing Strategy & Brand Development',
    governmentRelations: '• Government Relations & Public Policy',
    productLegalCompliance: '• Product Legal Compliance',
    maAdvisory: '• M&A Advisory & Exit Planning',
    digitalTransformation: '• Digital Transformation & Technology',
    totalExpertiseCoverage: '🎯 Total Expertise Coverage:',
    specializedAreas: '134 Specialized Areas',
    dualMode: 'Dual Practice + Advisory Mode',
    builtForStartups: '🚀 Built for Startups',
    startupOptimization: 'With 90% optimization for startup and entrepreneurship needs, Atticus covers the entire startup lifecycle:',
    ideaStage: 'Idea Stage',
    entityFormation: 'Entity Formation',
    seedStage: 'Seed Stage',
    fundraising: 'Fundraising',
    growthStage: 'Growth Stage',
    scaling: 'Scaling',
    exitStage: 'Exit Stage',
    maIpo: 'M&A / IPO',
    privacyFirst: '🔒 Privacy-First Architecture',
    allDataLocal: '✓ All data stored locally on your machine - no cloud storage',
    apiCallsDirectNoIntermed: '✓ API calls made directly to your chosen providers - no intermediaries',
    fullDataControl: '✓ Full control over your data and conversations (including API expenses)',
    importantDisclaimer: '⚠️ Important Disclaimer',
    disclaimerText: 'Atticus is an AI-powered assistant designed to provide general information and guidance. It does not provide legal advice, and its outputs should not be relied upon as a substitute for consultation with qualified legal or business professionals. Always consult with licensed attorneys, accountants, or other qualified advisors for specific legal, tax, or business matters affecting your situation.',
    systemStatistics: 'System Statistics',
    totalPracticeAreas: 'Total Practice Areas:',
    totalAdvisoryAreas: 'Total Advisory Areas:',
    totalKeywords: 'Total Keywords:',
    supportedProviders: 'Supported Providers:',
    providersAvailableConfigured: 'available, configured',
    builtWith: 'Built With',
    reactTypescript: '⚛️ React + TypeScript',
    electronApp: '⚡ Electron Desktop App',
    tailwindCss: '🎨 Tailwind CSS',
    multiProviderAi: '🤖 Multi-Provider AI Integration',
    piiScanningTitle: '🔒 Privacy & PII Scanning',
    piiScanningDescription: 'PII (Personally Identifiable Information) scanning to help protect your sensitive data before sending it to AI providers.',
    alwaysEnabled: 'ALWAYS ENABLED',
    automaticallyScans: 'Automatically scans your messages for sensitive information like SSN, credit cards, emails, phone numbers, and more before sending to AI providers.',
    legalProtectionFull: 'Legal Protection: PII scanning cannot be disabled. This mandatory security feature protects both you and Atticus from liability by ensuring you\'re always warned before sharing sensitive data.',
    scannerCoverage: 'Scanner Coverage',
    critical: 'Critical',
    moderate: 'Moderate',
    whatGetsDetected: 'What Gets Detected',
    examplesOfSensitiveData: 'Examples of sensitive data patterns that are automatically scanned:',
    criticalRisk: 'Critical Risk',
    usSsn: '• US Social Security Numbers (SSN)',
    canadianSin: '• Canadian Social Insurance (SIN)',
    mexicanCurp: '• Mexican CURP Numbers',
    mexicanRfc: '• Mexican RFC (Tax ID)',
    euUkNationalId: '• EU/UK National ID Numbers',
    creditCards: '• Credit Card Numbers (All Types)',
    passwordsCredentials: '• Passwords & Credentials',
    apiKeysTokens: '• API Keys & Access Tokens',
    highRiskCategory: 'High Risk',
    ibanAccounts: '• IBAN Account Numbers (EU/UK)',
    clabeCodes: '• CLABE Codes (Mexico)',
    canadianHealthCard: '• Canadian Health Card Numbers',
    euVatNumbers: '• EU VAT Numbers',
    passportNumbers: '• Passport Numbers',
    emailAddresses: '• Email Addresses',
    phoneNumbers: '• Phone Numbers (International)',
    bankAccounts: '• Bank Account Numbers',
    usRoutingNumbers: '• US Routing Numbers',
    canadianTransitNumbers: '• Canadian Transit Numbers',
    swiftBicCodes: '• SWIFT/BIC Codes',
    medicalRecordNumbers: '• Medical Record Numbers',
    moderateRisk: 'Moderate Risk',
    driversLicense: '• Driver\'s License Numbers',
    taxIdsEins: '• Tax IDs / EINs',
    legalCaseNumbers: '• Legal Case Numbers',
    streetAddresses: '• Street Addresses',
    zipPostalCodes: '• ZIP/Postal Codes',
    ipAddresses: '• IP Addresses (IPv4/IPv6)',
    fullNamesWithTitles: '• Full Names with Titles',
    patternsNote: 'Note: The above are representative examples. The scanner uses {count} total patterns covering variations and additional formats.',
    patterns: 'Patterns',
    importantPrivacyInfoTitle: 'ℹ️ Important Privacy Information',
    detectionLocal: '✓ All PII detection happens locally on your device - no data sent externally',
    scannerWarningsOnly: '✓ Scanner provides warnings but cannot prevent you from sending data',
    userResponsibility: '✓ You are ultimately responsible for protecting confidential information',
    reviewProviderPolicies: '✓ Each AI provider has different privacy policies - review them carefully',
    useExampleData: '✓ Consider using example data or anonymizing details for sensitive queries',
    noDataCollection: '✓ Atticus developers never collect, store, or have access to your data',
    editConfiguration: 'Edit Configuration',
    editAnalysisPrompt: 'Edit Analysis Prompt',
    editInstructions: 'Edit the analysis system prompt below. This prompt guides the AI quality analyst when comparing responses from different models.',
    analysisPromptLabel: 'Analysis System Prompt',
    characterCount: 'characters',
    yamlEditInstructions: 'Edit the configuration below. Changes will take effect after restarting Atticus.',
    idReadOnly: 'ID (read-only)',
    name: 'Name',
    description: 'Description',
    color: 'Color',
    systemPrompt: 'System Prompt',
    systemPromptHelp: 'This prompt defines the AI\'s expertise, approach, and guidelines when responding to queries in this area.',
    keywords: 'Keywords',
    noKeywordsYet: 'No keywords added yet',
    addKeyword: 'Add',
    deleteArea: 'Delete Area',
    collapse: 'Collapse',
    expand: 'Expand',
    // Additional Settings UI strings
    configured: '✓ Configured',
    active: 'Active',
    defaultModel: 'Default Model',
    availableModels: 'Available Models (check to enable, select domain usage)',
    useFor: 'Use for:',
    removeApiKey: 'Remove API key for {provider}? This will delete the provider configuration.',
    azureResourceNamePlaceholder: 'Just the resource name from your Azure OpenAI URL (e.g., "my-openai-resource")',
    azureResourceName: 'Azure Resource Name',
    customize: 'Customize',
    resetting: 'Resetting',
    reset: 'Reset',
    update: 'Update',
    activate: 'Activate',
    confirmResetFactory: 'Are you sure you want to reset {type} configuration to factory defaults?\\n\\nThis will overwrite any customizations you\'ve made.',
    enterAnalysisPromptPlaceholder: 'Enter your analysis prompt here...',
    europe: 'Europe',
    coverage: 'Coverage',
    addNewArea: 'Add New Area',
    deleteAreaConfirm: 'Delete this area?',
    file: 'File:',
    showMore: 'Show More',
    showLess: 'Show Less',
    totalPatterns: 'Total Patterns',
    highRisk: 'High Risk',
    selectDefaultModel: 'Select default model for {provider}',
    enableModel: 'Enable {model} model',
    // Error messages
    errorElectronApiNotAvailable: 'Electron API not available. Please restart the application.',
    errorInvalidAnalysisYaml: 'Invalid analysis.yaml structure - missing \'analysis\' section',
    errorFailedToLoadConfig: 'Failed to load configuration file',
    errorYamlParsingFailed: 'YAML parsing failed: {error}',
    configurationLoadError: 'Configuration Load Error',
    // Additional provider strings
    getYourApiKey: 'Get your {apiKeyLabel} →',
    setAsActiveProvider: 'Set as Active Provider',
    resourceNamePlaceholder: 'my-resource-name',
    // Editor dialog strings
    editFile: 'Edit {filename}',
    close: 'Close',
    removeKeyword: 'Remove keyword',
    colorPlaceholder: '#3B82F6',
    // Misc
    copyrightVersion: 'Copyright © 2025, John Kost, All Rights Reserved | v{version}',
};

export const translations: Record<Language, Translations> = {
    en: {
        // Header
        appTitle: 'Atticus',
        appSubtitle: 'In-House AI Counsel',
        providersConfigured: 'Configured',
        provider: 'Provider',
        providers: 'Providers',
        viewLogs: 'View Logs',
        settings: 'Settings',

        // Footer
        disclaimer: 'Atticus is an AI assistant. Always consult with a licensed attorney for legal advice.',

        // Sidebar
        newConversation: 'New Conversation',
        conversations: 'Conversations',
        search: 'Search',
        searchConversations: 'Search conversations...',
        noConversationsFound: 'No conversations found',
        messages: 'messages',
        deleteConversation: 'Delete conversation',
        confirmDelete: 'Are you sure you want to delete this conversation?',
        cancel: 'Cancel',
        delete: 'Delete',

        // Chat Window
        startConversation: 'Start a conversation',
        typeYourMessage: 'Type your message here...',
        sendMessage: 'Send message',
        attachFile: 'Attach file',
        you: 'You',
        atticus: 'Atticus',
        exportToPDF: 'Export to PDF',
        copyToClipboard: 'Copy to clipboard',
        addTag: 'Add tag',

        // Configuration Dialog
        threadConfiguration: 'Thread Configuration',
        selectModels: 'Select Models',
        selectJurisdictions: 'Select Jurisdictions',
        practiceArea: 'Practice Area',
        advisoryArea: 'Advisory Area',
        maxTokens: 'Max Tokens',
        done: 'Done',
        close: 'Close',

        // Settings
        providerSettings: 'Provider Settings',
        addProvider: 'Add Provider',
        editProvider: 'Edit Provider',
        providerName: 'Provider Name',
        apiKey: 'API Key',
        baseURL: 'Base URL',
        model: 'Model',
        save: 'Save',

        // Jurisdictions
        unitedStates: 'United States',
        canada: 'Canada',
        unitedKingdom: 'United Kingdom',
        europeanUnion: 'European Union',
        australia: 'Australia',

        // Practice Areas
        corporateLaw: 'Corporate Law',
        contractLaw: 'Contract Law',
        intellectualProperty: 'Intellectual Property',
        employmentLaw: 'Employment Law',
        realEstate: 'Real Estate',
        litigation: 'Litigation',
        compliance: 'Compliance',

        // Advisory Areas
        strategicPlanning: 'Strategic Planning',
        riskManagement: 'Risk Management',
        operations: 'Operations',
        finance: 'Finance',
        humanResources: 'Human Resources',
        marketing: 'Marketing',

        // Common
        loading: 'Loading...',
        error: 'Error',
        success: 'Success',
        warning: 'Warning',
        info: 'Information',
        yes: 'Yes',
        no: 'No',
        ok: 'OK',

        // Cost/Usage
        totalCost: 'Total Cost',
        inputTokens: 'Input Tokens',
        outputTokens: 'Output Tokens',
        totalTokens: 'Total Tokens',
        costLedger: 'Cost Ledger',

        // Export
        exportConversation: 'Export Conversation',
        exportMessage: 'Export Message',
        exportAll: 'Export All',

        // Privacy
        privacyWarning: 'Privacy Warning',
        piiDetected: 'Personally Identifiable Information Detected',
        continueAnyway: 'Continue Anyway',

        // Errors
        apiError: 'API Error',
        connectionError: 'Connection Error',
        unexpectedError: 'Unexpected Error',

        // File Upload
        uploadFile: 'Upload File',
        fileAttached: 'File Attached',
        removeFile: 'Remove File',

        // Actions
        edit: 'Edit',
        resend: 'Resend',
        retry: 'Retry',
        inspect: 'Inspect',

        // Settings Component
        settingsTabs: {
            providers: 'Providers',
            practice: 'Practice Areas',
            advisory: 'Advisory Areas',
            analysis: 'Analysis',
            privacy: 'Privacy',
            about: 'About',
        },

        // Settings - Providers
        settingsProviders: {
            resetToDefaults: 'Reset to factory defaults',
            enterApiKey: 'Enter API Key',
            pasteApiKeyHere: 'Paste your API key here',
            removeProviderConfirmation: 'Remove API key and provider configuration',
            azureResourceNameRequired: 'Please enter your Azure resource name',
            invalidApiKey: 'Please enter a valid API key',
            getApiKey: 'Get API Key',
            providerConfiguration: 'Provider Configuration',
            selectModel: 'Select Model',
            endpoint: 'Endpoint',
            temperature: 'Temperature',
            domains: 'Domains',
            practiceOnly: 'Practice areas only',
            advisoryOnly: 'Advisory areas only',
            bothPracticeAdvisory: 'Both practice and advisory',
            introText: 'Configure AI providers to enable Atticus. You can add multiple providers and switch between them.',
            update: 'Update',
            activate: 'Activate',
            removeApiKey: 'Remove API key and provider configuration',
            resetting: 'Resetting...',
            reset: 'Reset',
            editConfiguration: 'Edit configuration',
            customize: 'Customize',
            saveChanges: 'Save Changes',
        },

        // Settings - Practice/Advisory
        settingsAreas: {
            areaName: 'Area name',
            areaDescription: 'Area description',
            areaId: 'Area ID',
            newArea: 'New Area',
            newAreaDescription: 'Description for new area',
            deleteArea: 'Delete area',
            pickColor: 'Pick color',
            areaColor: 'Area color',
            enabled: 'Enabled',
            disabled: 'Disabled',
            keywords: 'Keywords',
            addKeyword: 'Add keyword',
            addKeywordPlaceholder: 'Add keyword...',
            systemPrompt: 'System Prompt',
            systemPromptPlaceholder: 'Enter the system prompt that will guide AI responses for this area...',
            editYaml: 'Edit YAML',
            backToList: 'Back to list',
            loadFromFile: 'Load from file',
            saveChanges: 'Save changes',
            discardChanges: 'Discard changes',
            showMore: 'Show more',
            showLess: 'Show less',
        },

        // Settings - Analysis
        settingsAnalysis: {
            analysisConfiguration: 'Analysis Configuration',
            systemPromptLabel: 'Analysis System Prompt',
            systemPromptPlaceholder: 'Enter the system prompt for response analysis...',
            emptyPromptError: 'Analysis system prompt cannot be empty',
            usedWhen: 'Used when: User clicks "Analyze Response Cluster" to compare multiple AI responses',
            resetComplete: 'Configuration has been reset to factory defaults',
            whatIsResponseAnalysis: '💡 What is Response Analysis?',
            responseAnalysisDescription: 'When you receive responses from multiple AI models, you can use an independent "judge" model to analyze and compare them. The analysis system prompt guides this judge model to evaluate consistency, accuracy, completeness, and quality of the responses.',
            keyAnalysisCriteria: 'Key Analysis Criteria',
            consistencyDescription: 'Are the responses aligned with each other?',
            accuracyDescription: 'Identify potential inaccuracies or confabulations',
            completenessDescription: 'What important points are missing?',
            qualityRankingDescription: 'Rank responses from best to worst',
            recommendationsDescription: 'Which response(s) to trust most',
            customizationNote: '⚠️ Customization Note',
            customizationDescription: 'The analysis prompt can be customized to emphasize specific criteria relevant to your use case (e.g., legal accuracy, technical precision, business viability). Click "Customize" to edit the system prompt in a structured editor.',
            critical: 'Critical',
        },

        // Settings - Privacy
        settingsPrivacy: {
            privacyConfiguration: 'Privacy Configuration',
            piiScanningEnabled: 'PII Scanning Enabled',
            auditLoggingEnabled: 'Audit Logging Enabled',
            dataRetention: 'Data Retention',
            jurisdiction: 'Jurisdiction',
            selectJurisdiction: 'Select jurisdiction',
        },

        // Settings - About
        settingsAbout: {
            aboutAtticus: 'About Atticus',
            version: 'Version',
            license: 'License',
            copyright: 'Copyright',
            documentation: 'Documentation',
            support: 'Support',
        },

        // Alerts & Notifications
        alerts: {
            configureProviderFirst: 'Please configure an AI provider first',
            exportFailed: 'Failed to export PDF',
            exportSuccess: 'Successfully exported to PDF',
            saveFailed: 'Failed to save',
            saveSuccess: 'Successfully saved',
            invalidApiKey: 'Please enter a valid API key',
            resetSuccess: 'Successfully reset to factory defaults',
            resetFailed: 'Failed to reset configuration',
            emptyPrompt: 'System prompt cannot be empty',
            unknownError: 'Unknown error',
            loadFailed: 'Failed to load configuration file',
            deleteFailed: 'Failed to delete',
            deleteSuccess: 'Successfully deleted',
            configurationReset: 'Configuration has been reset to factory defaults',
            enterAzureResourceName: 'Please enter your Azure resource name',
            factoryResetCancelled: 'Factory reset cancelled',
            validationErrors: 'Validation errors found',
        },

        // Cost Reporting
        costReport: {
            total: 'Total',
            input: 'Input',
            output: 'Output',
            tokens: 'tokens',
            milliseconds: 'ms',
            duration: 'Duration',
            costBreakdown: 'Cost Breakdown',
            usageDetails: 'Usage Details',
        },

        // Tags
        tags: {
            addTag: 'Add tag',
            removeTag: 'Remove tag',
            createNew: 'Create new',
            searchTags: 'Search tags...',
            tagCategory: 'Category',
            contentType: 'Content Type',
            priority: 'Priority',
            status: 'Status',
            noTagsFound: 'No tags found',
        },

        // Privacy & PII
        privacyDialog: {
            title: 'Privacy Warning',
            piiDetectedMessage: 'Personally Identifiable Information (PII) has been detected in your message',
            continueButton: 'Continue Anyway',
            cancelButton: 'Cancel',
            viewDetails: 'View Details',
            hideDetails: 'Hide Details',
            detectedItems: 'Detected Items',
            riskLevel: 'Risk Level',
            high: 'High',
            medium: 'Medium',
            low: 'Low',
        },

        // API Error Inspector
        apiInspector: {
            title: 'API Error Inspector',
            errorDetails: 'Error Details',
            errorCode: 'Error Code',
            httpStatus: 'HTTP Status',
            message: 'Message',
            request: 'Request',
            response: 'Response',
            headers: 'Headers',
            body: 'Body',
            timestamp: 'Timestamp',
        },

        // Log Viewer
        logViewer: {
            title: 'Log Viewer',
            filters: 'Filters',
            level: 'Level',
            component: 'Component',
            search: 'Search',
            clear: 'Clear',
            export: 'Export',
            noLogsFound: 'No logs found',
            showingLogs: 'Showing logs',
        },

        // File Upload
        fileUpload: {
            uploadFailed: 'Upload Failed',
            uploadComplete: 'Upload Complete',
            processingFile: 'Processing File',
            highRiskFileDetected: 'High-Risk File Detected',
            securityRating: 'Security Rating',
            threatLevel: 'Threat Level',
            detectedIssues: 'Detected Issues',
            warningPrefix: 'Warning:',
            proceedAnyway: 'Proceed Anyway',
        },

        // ChatWindow
        chatWindow: {
            welcomeTitle: 'Welcome to Atticus',
            welcomeSubtitle: 'Select a conversation or start a new one',
            addTag: 'Add tag',
            inspectError: 'Inspect Error',
            resendMessage: 'Resend Message',
            exportPDF: 'Export PDF',
            manageTags: 'Manage Tags',
            analyzeResponseCluster: 'Analyze Response Cluster',
            selectModel: 'Select a model...',
            runAnalysis: 'Run Analysis',
            noSelection: 'No selection:',
            single: 'Single:',
            multiple: 'Multiple:',
            globalLegalAnalysis: 'Global legal analysis',
            focusedAnalysis: 'Focused on that',
            comparativeAnalysis: 'Comparative analysis',
        },

        // Settings - Additional
        settingsAdditional: {
            loadingAdvisoryAreas: 'Loading advisory areas...',
            apiKeysNeverLeave: 'Your API keys never leave your device',
            piiScanner: 'PII Scanner',
            legalProtectionWarning: 'Legal Protection: PII scanning cannot',
            highRisk: 'High Risk',
            totalPatterns: 'Total Patterns',
            importantPrivacyInfo: 'Important Privacy Information',
            addNewArea: 'Add New Area',
            consistency: 'Consistency:',
            accuracy: 'Accuracy:',
            completeness: 'Completeness:',
            qualityRanking: 'Quality Ranking:',
            recommendations: 'Recommendations:',
        },

        // Settings - Comprehensive Content
        settingsContent: settingsContentEn,

        // Conversation Cost Ledger
        conversationCostLedger: {
            title: 'Cost Ledger',
            conversation: 'Conversation',
            totalSpent: 'Total Spent',
            breakdown: 'Breakdown',
            byProvider: 'By Provider',
            byModel: 'By Model',
            byDate: 'By Date',
            details: 'Details',
        },

        // Time & Date
        time: {
            justNow: 'Just now',
            minuteAgo: '1 minute ago',
            minutesAgo: '{n} minutes ago',
            hourAgo: '1 hour ago',
            hoursAgo: '{n} hours ago',
            dayAgo: '1 day ago',
            daysAgo: '{n} days ago',
            weekAgo: '1 week ago',
            weeksAgo: '{n} weeks ago',
            monthAgo: '1 month ago',
            monthsAgo: '{n} months ago',
            yearAgo: '1 year ago',
            yearsAgo: '{n} years ago',
        },
    },

    fr: {
        // Header
        appTitle: 'Atticus',
        appSubtitle: 'Conseiller Juridique IA Interne',
        providersConfigured: 'Configuré',
        provider: 'Fournisseur',
        providers: 'Fournisseurs',
        viewLogs: 'Voir les Journaux',
        settings: 'Paramètres',

        // Footer
        disclaimer: 'Atticus est un assistant IA. Consultez toujours un avocat agréé pour des conseils juridiques.',

        // Sidebar
        newConversation: 'Nouvelle Conversation',
        conversations: 'Conversations',
        search: 'Rechercher',
        searchConversations: 'Rechercher des conversations...',
        noConversationsFound: 'Aucune conversation trouvée',
        messages: 'messages',
        deleteConversation: 'Supprimer la conversation',
        confirmDelete: 'Êtes-vous sûr de vouloir supprimer cette conversation?',
        cancel: 'Annuler',
        delete: 'Supprimer',

        // Chat Window
        startConversation: 'Commencer une conversation',
        typeYourMessage: 'Tapez votre message ici...',
        sendMessage: 'Envoyer le message',
        attachFile: 'Joindre un fichier',
        you: 'Vous',
        atticus: 'Atticus',
        exportToPDF: 'Exporter en PDF',
        copyToClipboard: 'Copier dans le presse-papiers',
        addTag: 'Ajouter une étiquette',

        // Configuration Dialog
        threadConfiguration: 'Configuration du Fil',
        selectModels: 'Sélectionner les Modèles',
        selectJurisdictions: 'Sélectionner les Juridictions',
        practiceArea: 'Domaine de Pratique',
        advisoryArea: 'Domaine Consultatif',
        maxTokens: 'Jetons Maximum',
        done: 'Terminé',
        close: 'Fermer',

        // Settings
        providerSettings: 'Paramètres du Fournisseur',
        addProvider: 'Ajouter un Fournisseur',
        editProvider: 'Modifier le Fournisseur',
        providerName: 'Nom du Fournisseur',
        apiKey: 'Clé API',
        baseURL: 'URL de Base',
        model: 'Modèle',
        save: 'Enregistrer',

        // Jurisdictions
        unitedStates: 'États-Unis',
        canada: 'Canada',
        unitedKingdom: 'Royaume-Uni',
        europeanUnion: 'Union Européenne',
        australia: 'Australie',

        // Practice Areas
        corporateLaw: 'Droit des Sociétés',
        contractLaw: 'Droit des Contrats',
        intellectualProperty: 'Propriété Intellectuelle',
        employmentLaw: 'Droit du Travail',
        realEstate: 'Immobilier',
        litigation: 'Contentieux',
        compliance: 'Conformité',

        // Advisory Areas
        strategicPlanning: 'Planification Stratégique',
        riskManagement: 'Gestion des Risques',
        operations: 'Opérations',
        finance: 'Finance',
        humanResources: 'Ressources Humaines',
        marketing: 'Marketing',

        // Common
        loading: 'Chargement...',
        error: 'Erreur',
        success: 'Succès',
        warning: 'Avertissement',
        info: 'Information',
        yes: 'Oui',
        no: 'Non',
        ok: 'OK',

        // Cost/Usage
        totalCost: 'Coût Total',
        inputTokens: 'Jetons d\'Entrée',
        outputTokens: 'Jetons de Sortie',
        totalTokens: 'Jetons Totaux',
        costLedger: 'Registre des Coûts',

        // Export
        exportConversation: 'Exporter la Conversation',
        exportMessage: 'Exporter le Message',
        exportAll: 'Tout Exporter',

        // Privacy
        privacyWarning: 'Avertissement de Confidentialité',
        piiDetected: 'Informations Personnelles Identifiables Détectées',
        continueAnyway: 'Continuer Quand Même',

        // Errors
        apiError: 'Erreur API',
        connectionError: 'Erreur de Connexion',
        unexpectedError: 'Erreur Inattendue',

        // File Upload
        uploadFile: 'Télécharger un Fichier',
        fileAttached: 'Fichier Joint',
        removeFile: 'Retirer le Fichier',

        // Actions
        edit: 'Modifier',
        resend: 'Renvoyer',
        retry: 'Réessayer',
        inspect: 'Inspecter',

        // Settings Component
        settingsTabs: {
            providers: 'Fournisseurs',
            practice: 'Domaines de Pratique',
            advisory: 'Domaines Consultatifs',
            analysis: 'Analyse',
            privacy: 'Confidentialité',
            about: 'À Propos',
        },

        // Settings - Providers
        settingsProviders: {
            resetToDefaults: 'Réinitialiser aux paramètres d\'usine',
            enterApiKey: 'Entrer la Clé API',
            pasteApiKeyHere: 'Collez votre clé API ici',
            removeProviderConfirmation: 'Supprimer la clé API et la configuration du fournisseur',
            azureResourceNameRequired: 'Veuillez entrer le nom de votre ressource Azure',
            invalidApiKey: 'Veuillez entrer une clé API valide',
            getApiKey: 'Obtenir la Clé API',
            providerConfiguration: 'Configuration du Fournisseur',
            selectModel: 'Sélectionner le Modèle',
            endpoint: 'Point de Terminaison',
            temperature: 'Température',
            domains: 'Domaines',
            practiceOnly: 'Domaines de pratique uniquement',
            advisoryOnly: 'Domaines consultatifs uniquement',
            bothPracticeAdvisory: 'Pratique et consultatif',
            introText: 'Configurez les fournisseurs d\'IA pour activer Atticus. Vous pouvez ajouter plusieurs fournisseurs et basculer entre eux.',
            update: 'Mettre à Jour',
            activate: 'Activer',
            removeApiKey: 'Supprimer la clé API pour {provider}? Cela supprimera la configuration du fournisseur.',
            resetting: 'Réinitialisation...',
            reset: 'Réinitialiser',
            editConfiguration: 'Modifier la configuration',
            customize: 'Personnaliser',
            saveChanges: 'Enregistrer les Modifications',
        },

        // Settings - Practice/Advisory
        settingsAreas: {
            areaName: 'Nom du domaine',
            areaDescription: 'Description du domaine',
            areaId: 'ID du Domaine',
            newArea: 'Nouveau Domaine',
            newAreaDescription: 'Description du nouveau domaine',
            deleteArea: 'Supprimer le domaine',
            pickColor: 'Choisir la couleur',
            areaColor: 'Couleur du domaine',
            enabled: 'Activé',
            disabled: 'Désactivé',
            keywords: 'Mots-clés',
            addKeyword: 'Ajouter un mot-clé',
            addKeywordPlaceholder: 'Ajouter un mot-clé...',
            systemPrompt: 'Invite Système',
            systemPromptPlaceholder: 'Entrez l\'invite système qui guidera les réponses IA pour ce domaine...',
            editYaml: 'Modifier YAML',
            backToList: 'Retour à la liste',
            loadFromFile: 'Charger depuis un fichier',
            saveChanges: 'Enregistrer les modifications',
            discardChanges: 'Abandonner les modifications',
            showMore: 'Afficher plus',
            showLess: 'Afficher moins',
        },

        // Settings - Analysis
        settingsAnalysis: {
            analysisConfiguration: 'Configuration de l\'Analyse',
            systemPromptLabel: 'Invite Système d\'Analyse',
            systemPromptPlaceholder: 'Entrez l\'invite système pour l\'analyse des réponses...',
            emptyPromptError: 'L\'invite système d\'analyse ne peut pas être vide',
            usedWhen: 'Utilisé quand: L\'utilisateur clique sur "Analyser le Groupe de Réponses" pour comparer plusieurs réponses IA',
            resetComplete: 'La configuration a été réinitialisée aux paramètres d\'usine',
            whatIsResponseAnalysis: '💡 Qu\'est-ce que l\'Analyse des Réponses?',
            responseAnalysisDescription: 'Lorsque vous recevez des réponses de plusieurs modèles IA, vous pouvez utiliser un modèle "juge" indépendant pour les analyser et les comparer. L\'invite système d\'analyse guide ce modèle juge pour évaluer la cohérence, la précision, l\'exhaustivité et la qualité des réponses.',
            keyAnalysisCriteria: 'Critères d\'Analyse Clés',
            consistencyDescription: 'Les réponses sont-elles alignées les unes avec les autres?',
            accuracyDescription: 'Identifier les inexactitudes ou confabulations potentielles',
            completenessDescription: 'Quels points importants manquent?',
            qualityRankingDescription: 'Classer les réponses de la meilleure à la pire',
            recommendationsDescription: 'Quelle(s) réponse(s) faire le plus confiance',
            customizationNote: '⚠️ Note de Personnalisation',
            customizationDescription: 'L\'invite d\'analyse peut être personnalisée pour mettre l\'accent sur des critères spécifiques pertinents pour votre cas d\'usage (par exemple, précision juridique, précision technique, viabilité commerciale). Cliquez sur "Personnaliser" pour éditer l\'invite système dans un éditeur structuré.',
            critical: 'Critique',
        },

        // Settings - Privacy
        settingsPrivacy: {
            privacyConfiguration: 'Configuration de la Confidentialité',
            piiScanningEnabled: 'Analyse PII Activée',
            auditLoggingEnabled: 'Journal d\'Audit Activé',
            dataRetention: 'Conservation des Données',
            jurisdiction: 'Juridiction',
            selectJurisdiction: 'Sélectionner la juridiction',
        },

        // Settings - About
        settingsAbout: {
            aboutAtticus: 'À Propos d\'Atticus',
            version: 'Version',
            license: 'Licence',
            copyright: 'Droit d\'Auteur',
            documentation: 'Documentation',
            support: 'Support',
        },

        // Alerts & Notifications
        alerts: {
            configureProviderFirst: 'Veuillez d\'abord configurer un fournisseur IA',
            exportFailed: 'Échec de l\'export PDF',
            exportSuccess: 'Export PDF réussi',
            saveFailed: 'Échec de l\'enregistrement',
            saveSuccess: 'Enregistrement réussi',
            invalidApiKey: 'Veuillez entrer une clé API valide',
            resetSuccess: 'Réinitialisation aux paramètres d\'usine réussie',
            resetFailed: 'Échec de la réinitialisation de la configuration',
            emptyPrompt: 'L\'invite système ne peut pas être vide',
            unknownError: 'Erreur inconnue',
            loadFailed: 'Échec du chargement du fichier de configuration',
            deleteFailed: 'Échec de la suppression',
            deleteSuccess: 'Suppression réussie',
            configurationReset: 'La configuration a été réinitialisée aux paramètres d\'usine',
            enterAzureResourceName: 'Veuillez entrer le nom de votre ressource Azure',
            factoryResetCancelled: 'Réinitialisation d\'usine annulée',
            validationErrors: 'Erreurs de validation trouvées',
        },

        // Cost Reporting
        costReport: {
            total: 'Total',
            input: 'Entrée',
            output: 'Sortie',
            tokens: 'jetons',
            milliseconds: 'ms',
            duration: 'Durée',
            costBreakdown: 'Répartition des Coûts',
            usageDetails: 'Détails d\'Utilisation',
        },

        // Tags
        tags: {
            addTag: 'Ajouter une étiquette',
            removeTag: 'Supprimer l\'étiquette',
            createNew: 'Créer nouveau',
            searchTags: 'Rechercher des étiquettes...',
            tagCategory: 'Catégorie',
            contentType: 'Type de Contenu',
            priority: 'Priorité',
            status: 'Statut',
            noTagsFound: 'Aucune étiquette trouvée',
        },

        // Privacy & PII
        privacyDialog: {
            title: 'Avertissement de Confidentialité',
            piiDetectedMessage: 'Des Informations Personnelles Identifiables (PII) ont été détectées dans votre message',
            continueButton: 'Continuer Quand Même',
            cancelButton: 'Annuler',
            viewDetails: 'Voir les Détails',
            hideDetails: 'Masquer les Détails',
            detectedItems: 'Éléments Détectés',
            riskLevel: 'Niveau de Risque',
            high: 'Élevé',
            medium: 'Moyen',
            low: 'Faible',
        },

        // API Error Inspector
        apiInspector: {
            title: 'Inspecteur d\'Erreurs API',
            errorDetails: 'Détails de l\'Erreur',
            errorCode: 'Code d\'Erreur',
            httpStatus: 'Statut HTTP',
            message: 'Message',
            request: 'Requête',
            response: 'Réponse',
            headers: 'En-têtes',
            body: 'Corps',
            timestamp: 'Horodatage',
        },

        // Log Viewer
        logViewer: {
            title: 'Visionneuse de Journaux',
            filters: 'Filtres',
            level: 'Niveau',
            component: 'Composant',
            search: 'Rechercher',
            clear: 'Effacer',
            export: 'Exporter',
            noLogsFound: 'Aucun journal trouvé',
            showingLogs: 'Affichage des journaux',
        },

        // File Upload
        fileUpload: {
            uploadFailed: 'Échec du Téléversement',
            uploadComplete: 'Téléversement Terminé',
            processingFile: 'Traitement du Fichier',
            highRiskFileDetected: 'Fichier à Haut Risque Détecté',
            securityRating: 'Évaluation de Sécurité',
            threatLevel: 'Niveau de Menace',
            detectedIssues: 'Problèmes Détectés',
            warningPrefix: 'Avertissement:',
            proceedAnyway: 'Procéder Quand Même',
        },

        // ChatWindow
        chatWindow: {
            welcomeTitle: 'Bienvenue à Atticus',
            welcomeSubtitle: 'Sélectionnez une conversation ou démarrez-en une nouvelle',
            addTag: 'Ajouter une étiquette',
            inspectError: 'Inspecter l\'Erreur',
            resendMessage: 'Renvoyer le Message',
            exportPDF: 'Exporter en PDF',
            manageTags: 'Gérer les Étiquettes',
            analyzeResponseCluster: 'Analyser le Groupe de Réponses',
            selectModel: 'Sélectionner un modèle...',
            runAnalysis: 'Exécuter l\'Analyse',
            noSelection: 'Aucune sélection:',
            single: 'Simple:',
            multiple: 'Multiple:',
            globalLegalAnalysis: 'Analyse juridique globale',
            focusedAnalysis: 'Concentré sur cela',
            comparativeAnalysis: 'Analyse comparative',
        },

        // Settings - Additional
        settingsAdditional: {
            loadingAdvisoryAreas: 'Chargement des zones de conseil...',
            apiKeysNeverLeave: 'Vos clés API ne quittent jamais votre appareil',
            piiScanner: 'Scanneur de PII',
            legalProtectionWarning: 'Protection Juridique: Le balayage des PII ne peut pas',
            highRisk: 'Haut Risque',
            totalPatterns: 'Total des Modèles',
            importantPrivacyInfo: 'Informations Importantes sur la Confidentialité',
            addNewArea: 'Ajouter une Nouvelle Zone',
            consistency: 'Cohérence:',
            accuracy: 'Précision:',
            completeness: 'Complétude:',
            qualityRanking: 'Classement de Qualité:',
            recommendations: 'Recommandations:',
        },

        // Settings - Comprehensive (French translations)
        settingsContent: {
            practice: '⚖️ Pratique',
            practiceOnly: 'Domaines de pratique uniquement',
            advisory: '💼 Conseil',
            advisoryOnly: 'Domaines de conseil uniquement',
            both: '🔄 Les deux',
            configureModelNote: 'Configurez chaque modèle pour les domaines de pratique (juridique), les domaines de conseil (conseil d\'entreprise), ou les deux. Cela vous permet d\'optimiser des modèles spécifiques pour leurs forces.',
            viewTemplates: 'Voir les Modèles de Fournisseurs Disponibles',
            addProvider: 'Ajouter un Nouveau Fournisseur IA',
            needHelp: 'Besoin d\'Aide?',
            apiKeysStoredSecurely: '• Vos clés API sont stockées en toute sécurité sur votre machine locale',
            configureMultipleProviders: '• Vous pouvez configurer plusieurs fournisseurs et basculer entre eux',
            apiCallsDirect: '• Tous les appels API sont effectués directement aux fournisseurs - pas d\'intermédiaires',
            incurCostsDirectly: '• Vous engagez des coûts directement avec chaque fournisseur en fonction de l\'utilisation',
            configured: '✓ Configuré',
            active: 'Actif',
            defaultModel: 'Modèle par Défaut',
            availableModels: 'Modèles Disponibles (cocher pour activer, sélectionner l\'utilisation du domaine)',
            selectDefaultModel: 'Sélectionner le modèle par défaut pour {provider}',
            enableModel: 'Activer le modèle {model}',
            useFor: 'Utiliser pour:',
            azureResourceName: 'Nom de la Ressource Azure',
            resourceNamePlaceholder: 'mon-nom-de-ressource',
            getYourApiKey: 'Obtenez votre {apiKeyLabel} →',
            setAsActiveProvider: 'Définir comme Fournisseur Actif',
            confirmResetFactory: 'Êtes-vous sûr de vouloir réinitialiser la configuration {type} aux paramètres d\'usine?\\n\\nCela écrasera toutes les personnalisations que vous avez apportées.',
            practiceAreasDetection: 'Atticus détecte automatiquement le domaine de pratique en fonction du contenu de votre conversation. Voici les domaines de pratique configurés:',
            legalPracticeAreasCoverage: 'Couverture des Domaines de Pratique Juridique',
            specializedPracticeAreas: 'domaines de pratique spécialisés avec',
            automaticAreaDetection: '• Détection automatique du domaine et conseils juridiques contextuels',
            coversLegalDomains: '• Couvre le droit des sociétés, la propriété intellectuelle, le droit du travail, les contrats, la conformité, la vie privée, et plus encore',
            advisoryCapabilities: 'Atticus fournit des capacités de conseil d\'entreprise complètes pour compléter les services juridiques. Le système détecte automatiquement les sujets de conseil et ajuste les conseils en conséquence.',
            businessAdvisoryCoverage: 'Couverture du Conseil d\'Entreprise',
            specializedAdvisoryAreas: 'domaines de conseil spécialisés avec',
            automaticTopicDetection: '• Détection automatique du sujet et conseils contextuels',
            coversAdvisoryDomains: '• Couvre la stratégie, les finances, le marketing, les opérations, les RH, la technologie, les risques, la durabilité et les fusions-acquisitions',
            complementsLegalAreas: '• Complète les domaines de pratique juridique pour un soutien commercial complet',
            updateAvailable: 'Mise à Jour Disponible',
            dismiss: 'Ignorer',
            responseAnalysisConfig: '🔍 Configuration de l\'Analyse des Réponses',
            configureAnalysisPrompt: 'Configurez l\'invite système utilisée pour la validation et l\'analyse des réponses multi-modèles. Cette invite guide l\'analyste qualité IA lors de la comparaison des réponses de différents modèles.',
            analysisSystemPrompt: 'Invite Système d\'Analyse',
            definesAnalysis: 'Définit comment les modèles IA analysent et comparent les réponses pour la cohérence, la précision et la qualité.',
            currentConfiguration: 'Configuration Actuelle',
            sourceAnalysisYaml: 'Source: analysis.yaml',
            configuredPromptInfo: '[Invite système configurée pour l\'analyse des réponses]',
            usedWhen: 'Utilisé quand: L\'utilisateur clique sur "Analyser le Cluster de Réponses" pour comparer plusieurs réponses IA à l\'aide d\'un modèle indépendant.',
            whatIsResponseAnalysis: '💡 Qu\'est-ce que l\'Analyse des Réponses?',
            responseAnalysisExplanation: 'Lorsque vous recevez des réponses de plusieurs modèles IA, vous pouvez utiliser un modèle "juge" indépendant pour les analyser et les comparer. L\'invite système d\'analyse guide ce modèle juge pour évaluer la cohérence, la précision, l\'exhaustivité et la qualité des réponses.',
            keyAnalysisCriteria: 'Critères d\'Analyse Clés',
            consistencyCheck: '1. Cohérence: Les réponses sont-elles alignées les unes avec les autres?',
            accuracyCheck: '2. Précision: Identifier les inexactitudes potentielles ou les confabulations',
            completenessCheck: '3. Exhaustivité: Quels points importants manquent?',
            qualityRankingCheck: '4. Classement de Qualité: Classer les réponses de la meilleure à la pire',
            recommendationsCheck: '5. Recommandations: Quelle(s) réponse(s) faire le plus confiance',
            customizationNote: '⚠️ Note de Personnalisation',
            customizationExplanation: 'L\'invite d\'analyse peut être personnalisée pour mettre l\'accent sur des critères spécifiques pertinents pour votre cas d\'utilisation (par exemple, précision juridique, précision technique, viabilité commerciale). Cliquez sur "Personnaliser" pour modifier l\'invite système dans un éditeur structuré.',
            configurationLoadError: 'Erreur de Chargement de la Configuration',
            copyright: 'Copyright © 2025, John Kost, Tous Droits Réservés',
            copyrightVersion: 'Copyright © 2025, John Kost, Tous Droits Réservés | v{version}',
            europe: 'Europe',
            coverage: 'Couverture',
            ourMission: '🎯 Notre Mission',
            missionStatement: 'Atticus vise à démocratiser l\'accès à des services de conseil juridique et commercial de haute qualité en combinant l\'intelligence artificielle avec une expertise de domaine complète. Nous croyons que les entrepreneurs, les startups et les entreprises de toutes tailles méritent des conseils juridiques et stratégiques sophistiqués pour naviguer dans le paysage réglementaire et commercial complexe d\'aujourd\'hui.',
            globalCoverage: '🌍 Couverture Mondiale',
            globalCoverageDescription: 'Atticus fournit un soutien spécialisé pour les startups et les entreprises opérant dans:',
            comprehensiveCapabilities: '⚡ Capacités Complètes',
            legalPracticeAreas: 'Domaines de Pratique Juridique',
            corporateBusinessLaw: '• Droit des Sociétés et des Affaires',
            intellectualProperty: '• Propriété Intellectuelle',
            employmentLaborLaw: '• Droit du Travail et de l\'Emploi',
            startupEntrepreneurship: '• Startup et Entrepreneuriat',
            ventureCapitalFinance: '• Capital-Risque et Finance',
            crossBorderOperations: '• Opérations Transfrontalières',
            privacyDataProtection: '• Confidentialité et Protection des Données',
            andMoreAreas: '• Et 60 domaines spécialisés supplémentaires',
            businessAdvisoryAreas: 'Domaines de Conseil d\'Entreprise',
            strategicPlanning: '• Planification Stratégique et Stratégie d\'Entreprise',
            financialAdvisory: '• Conseil Financier et Finance d\'Entreprise',
            marketingStrategy: '• Stratégie Marketing et Développement de Marque',
            governmentRelations: '• Relations Gouvernementales et Politique Publique',
            productLegalCompliance: '• Conformité Juridique des Produits',
            maAdvisory: '• Conseil en Fusions-Acquisitions et Planification de Sortie',
            digitalTransformation: '• Transformation Numérique et Technologie',
            totalExpertiseCoverage: '🎯 Couverture Totale de l\'Expertise:',
            specializedAreas: '134 Domaines Spécialisés',
            dualMode: 'Mode Double Pratique + Conseil',
            builtForStartups: '🚀 Conçu pour les Startups',
            startupOptimization: 'Avec 90% d\'optimisation pour les besoins en startup et entrepreneuriat, Atticus couvre l\'ensemble du cycle de vie des startups:',
            ideaStage: 'Phase d\'Idée',
            entityFormation: 'Formation d\'Entité',
            seedStage: 'Phase d\'Amorçage',
            fundraising: 'Levée de Fonds',
            growthStage: 'Phase de Croissance',
            scaling: 'Mise à l\'Échelle',
            exitStage: 'Phase de Sortie',
            maIpo: 'Fusion-Acquisition / IPO',
            privacyFirst: '🔒 Architecture Axée sur la Confidentialité',
            allDataLocal: '✓ Toutes les données stockées localement sur votre machine - pas de stockage cloud',
            apiCallsDirectNoIntermed: '✓ Appels API effectués directement à vos fournisseurs choisis - pas d\'intermédiaires',
            fullDataControl: '✓ Contrôle total sur vos données et conversations (y compris les dépenses API)',
            importantDisclaimer: '⚠️ Avertissement Important',
            disclaimerText: 'Atticus est un assistant alimenté par IA conçu pour fournir des informations et des conseils généraux. Il ne fournit pas de conseils juridiques, et ses résultats ne doivent pas être considérés comme un substitut à une consultation avec des professionnels juridiques ou commerciaux qualifiés. Consultez toujours des avocats, des comptables ou d\'autres conseillers qualifiés pour des questions juridiques, fiscales ou commerciales spécifiques affectant votre situation.',
            systemStatistics: 'Statistiques du Système',
            totalPracticeAreas: 'Total des Domaines de Pratique:',
            totalAdvisoryAreas: 'Total des Domaines de Conseil:',
            totalKeywords: 'Total des Mots-Clés:',
            supportedProviders: 'Fournisseurs Pris en Charge:',
            providersAvailableConfigured: 'disponibles, configurés',
            builtWith: 'Construit Avec',
            reactTypescript: '⚛️ React + TypeScript',
            electronApp: '⚡ Application de Bureau Electron',
            tailwindCss: '🎨 Tailwind CSS',
            multiProviderAi: '🤖 Intégration IA Multi-Fournisseurs',
            piiScanningTitle: '🔒 Confidentialité et Analyse des PII',
            piiScanningDescription: 'Analyse des PII (Informations Personnellement Identifiables) pour aider à protéger vos données sensibles avant de les envoyer aux fournisseurs IA.',
            alwaysEnabled: 'TOUJOURS ACTIVÉ',
            automaticallyScans: 'Analyse automatiquement vos messages pour des informations sensibles telles que le numéro de sécurité sociale, les cartes de crédit, les e-mails, les numéros de téléphone, et plus encore avant de les envoyer aux fournisseurs IA.',
            legalProtectionFull: 'Protection Juridique: L\'analyse des PII ne peut pas être désactivée. Cette fonctionnalité de sécurité obligatoire vous protège, vous et Atticus, de toute responsabilité en veillant à ce que vous soyez toujours averti avant de partager des données sensibles.',
            scannerCoverage: 'Couverture du Scanner',
            critical: 'Critique',
            moderate: 'Modéré',
            highRisk: 'Risque Élevé',
            totalPatterns: 'Total des Modèles',
            whatGetsDetected: 'Ce Qui Est Détecté',
            examplesOfSensitiveData: 'Exemples de modèles de données sensibles qui sont automatiquement analysés:',
            criticalRisk: 'Risque Critique',
            usSsn: '• Numéros de Sécurité Sociale américains (SSN)',
            canadianSin: '• Assurance Sociale canadienne (SIN)',
            mexicanCurp: '• Numéros CURP mexicains',
            mexicanRfc: '• RFC mexicain (ID Fiscal)',
            euUkNationalId: '• Numéros d\'Identité Nationale EU/UK',
            creditCards: '• Numéros de Carte de Crédit (Tous Types)',
            passwordsCredentials: '• Mots de Passe et Identifiants',
            apiKeysTokens: '• Clés API et Jetons d\'Accès',
            highRiskCategory: 'Risque Élevé',
            ibanAccounts: '• Numéros de Compte IBAN (EU/UK)',
            clabeCodes: '• Codes CLABE (Mexique)',
            canadianHealthCard: '• Numéros de Carte Santé canadienne',
            euVatNumbers: '• Numéros de TVA EU',
            passportNumbers: '• Numéros de Passeport',
            emailAddresses: '• Adresses E-mail',
            phoneNumbers: '• Numéros de Téléphone (International)',
            bankAccounts: '• Numéros de Compte Bancaire',
            usRoutingNumbers: '• Numéros de Routage américains',
            canadianTransitNumbers: '• Numéros de Transit canadiens',
            swiftBicCodes: '• Codes SWIFT/BIC',
            medicalRecordNumbers: '• Numéros de Dossier Médical',
            moderateRisk: 'Risque Modéré',
            driversLicense: '• Numéros de Permis de Conduire',
            taxIdsEins: '• Identifiants Fiscaux / EIN',
            legalCaseNumbers: '• Numéros de Dossier Juridique',
            streetAddresses: '• Adresses de Rue',
            zipPostalCodes: '• Codes Postaux',
            ipAddresses: '• Adresses IP (IPv4/IPv6)',
            fullNamesWithTitles: '• Noms Complets avec Titres',
            patternsNote: 'Note: Les éléments ci-dessus sont des exemples représentatifs. Le scanner utilise {count} modèles au total couvrant les variations et les formats supplémentaires.',
            patterns: 'Modèles',
            importantPrivacyInfoTitle: 'ℹ️ Informations Importantes sur la Confidentialité',
            detectionLocal: '✓ Toute détection de PII se produit localement sur votre appareil - aucune donnée envoyée à l\'extérieur',
            scannerWarningsOnly: '✓ Le scanner fournit des avertissements mais ne peut pas vous empêcher d\'envoyer des données',
            userResponsibility: '✓ Vous êtes finalement responsable de la protection des informations confidentielles',
            reviewProviderPolicies: '✓ Chaque fournisseur IA a des politiques de confidentialité différentes - examinez-les attentivement',
            useExampleData: '✓ Envisagez d\'utiliser des données d\'exemple ou d\'anonymiser les détails pour les requêtes sensibles',
            noDataCollection: '✓ Les développeurs d\'Atticus ne collectent, ne stockent ni n\'ont accès à vos données',
            editConfiguration: 'Modifier la Configuration',
            editAnalysisPrompt: 'Modifier l\'Invite d\'Analyse',
            editInstructions: 'Modifiez l\'invite système d\'analyse ci-dessous. Cette invite guide l\'analyste qualité IA lors de la comparaison des réponses de différents modèles.',
            analysisPromptLabel: 'Invite Système d\'Analyse',
            characterCount: 'caractères',
            yamlEditInstructions: 'Modifiez la configuration ci-dessous. Les modifications prendront effet après le redémarrage d\'Atticus.',
            idReadOnly: 'ID (lecture seule)',
            name: 'Nom',
            description: 'Description',
            color: 'Couleur',
            systemPrompt: 'Invite Système',
            systemPromptHelp: 'Cette invite définit l\'expertise, l\'approche et les directives de l\'IA lors de la réponse aux requêtes dans ce domaine.',
            keywords: 'Mots-Clés',
            noKeywordsYet: 'Aucun mot-clé ajouté pour le moment',
            addKeyword: 'Ajouter',
            deleteArea: 'Supprimer le Domaine',
            collapse: 'Réduire',
            expand: 'Développer',
            file: 'Fichier:',
            addNewArea: 'Ajouter un Nouveau Domaine',
        },

        // Conversation Cost Ledger
        conversationCostLedger: {
            title: 'Registre des Coûts',
            conversation: 'Conversation',
            totalSpent: 'Total Dépensé',
            breakdown: 'Répartition',
            byProvider: 'Par Fournisseur',
            byModel: 'Par Modèle',
            byDate: 'Par Date',
            details: 'Détails',
        },

        // Time & Date
        time: {
            justNow: 'À l\'instant',
            minuteAgo: 'Il y a 1 minute',
            minutesAgo: 'Il y a {n} minutes',
            hourAgo: 'Il y a 1 heure',
            hoursAgo: 'Il y a {n} heures',
            dayAgo: 'Il y a 1 jour',
            daysAgo: 'Il y a {n} jours',
            weekAgo: 'Il y a 1 semaine',
            weeksAgo: 'Il y a {n} semaines',
            monthAgo: 'Il y a 1 mois',
            monthsAgo: 'Il y a {n} mois',
            yearAgo: 'Il y a 1 an',
            yearsAgo: 'Il y a {n} ans',
        },
    },

    es: {
        // Header
        appTitle: 'Atticus',
        appSubtitle: 'Asesor Legal de IA Interno',
        providersConfigured: 'Configurado',
        provider: 'Proveedor',
        providers: 'Proveedores',
        viewLogs: 'Ver Registros',
        settings: 'Configuración',

        // Footer
        disclaimer: 'Atticus es un asistente de IA. Siempre consulte con un abogado autorizado para asesoramiento legal.',

        // Sidebar
        newConversation: 'Nueva Conversación',
        conversations: 'Conversaciones',
        search: 'Buscar',
        searchConversations: 'Buscar conversaciones...',
        noConversationsFound: 'No se encontraron conversaciones',
        messages: 'mensajes',
        deleteConversation: 'Eliminar conversación',
        confirmDelete: '¿Está seguro de que desea eliminar esta conversación?',
        cancel: 'Cancelar',
        delete: 'Eliminar',

        // Chat Window
        startConversation: 'Iniciar una conversación',
        typeYourMessage: 'Escriba su mensaje aquí...',
        sendMessage: 'Enviar mensaje',
        attachFile: 'Adjuntar archivo',
        you: 'Tú',
        atticus: 'Atticus',
        exportToPDF: 'Exportar a PDF',
        copyToClipboard: 'Copiar al portapapeles',
        addTag: 'Agregar etiqueta',

        // Configuration Dialog
        threadConfiguration: 'Configuración del Hilo',
        selectModels: 'Seleccionar Modelos',
        selectJurisdictions: 'Seleccionar Jurisdicciones',
        practiceArea: 'Área de Práctica',
        advisoryArea: 'Área Consultiva',
        maxTokens: 'Tokens Máximos',
        done: 'Hecho',
        close: 'Cerrar',

        // Settings
        providerSettings: 'Configuración del Proveedor',
        addProvider: 'Agregar Proveedor',
        editProvider: 'Editar Proveedor',
        providerName: 'Nombre del Proveedor',
        apiKey: 'Clave API',
        baseURL: 'URL Base',
        model: 'Modelo',
        save: 'Guardar',

        // Jurisdictions
        unitedStates: 'Estados Unidos',
        canada: 'Canadá',
        unitedKingdom: 'Reino Unido',
        europeanUnion: 'Unión Europea',
        australia: 'Australia',

        // Practice Areas
        corporateLaw: 'Derecho Corporativo',
        contractLaw: 'Derecho de Contratos',
        intellectualProperty: 'Propiedad Intelectual',
        employmentLaw: 'Derecho Laboral',
        realEstate: 'Bienes Raíces',
        litigation: 'Litigios',
        compliance: 'Cumplimiento',

        // Advisory Areas
        strategicPlanning: 'Planificación Estratégica',
        riskManagement: 'Gestión de Riesgos',
        operations: 'Operaciones',
        finance: 'Finanzas',
        humanResources: 'Recursos Humanos',
        marketing: 'Marketing',

        // Common
        loading: 'Cargando...',
        error: 'Error',
        success: 'Éxito',
        warning: 'Advertencia',
        info: 'Información',
        yes: 'Sí',
        no: 'No',
        ok: 'OK',

        // Cost/Usage
        totalCost: 'Costo Total',
        inputTokens: 'Tokens de Entrada',
        outputTokens: 'Tokens de Salida',
        totalTokens: 'Tokens Totales',
        costLedger: 'Libro de Costos',

        // Export
        exportConversation: 'Exportar Conversación',
        exportMessage: 'Exportar Mensaje',
        exportAll: 'Exportar Todo',

        // Privacy
        privacyWarning: 'Advertencia de Privacidad',
        piiDetected: 'Información Personal Identificable Detectada',
        continueAnyway: 'Continuar de Todos Modos',

        // Errors
        apiError: 'Error de API',
        connectionError: 'Error de Conexión',
        unexpectedError: 'Error Inesperado',

        // File Upload
        uploadFile: 'Subir Archivo',
        fileAttached: 'Archivo Adjunto',
        removeFile: 'Eliminar Archivo',

        // Actions
        edit: 'Editar',
        resend: 'Reenviar',
        retry: 'Reintentar',
        inspect: 'Inspeccionar',

        // Settings Component
        settingsTabs: {
            providers: 'Proveedores',
            practice: 'Áreas de Práctica',
            advisory: 'Áreas Consultivas',
            analysis: 'Análisis',
            privacy: 'Privacidad',
            about: 'Acerca de',
        },

        // Settings - Providers
        settingsProviders: {
            resetToDefaults: 'Restablecer a valores de fábrica',
            enterApiKey: 'Introducir Clave API',
            pasteApiKeyHere: 'Pegue su clave API aquí',
            removeProviderConfirmation: 'Eliminar clave API y configuración del proveedor',
            azureResourceNameRequired: 'Por favor, introduzca el nombre de su recurso Azure',
            invalidApiKey: 'Por favor, introduzca una clave API válida',
            getApiKey: 'Obtener Clave API',
            providerConfiguration: 'Configuración del Proveedor',
            selectModel: 'Seleccionar Modelo',
            endpoint: 'Punto Final',
            temperature: 'Temperatura',
            domains: 'Dominios',
            practiceOnly: 'Solo áreas de práctica',
            advisoryOnly: 'Solo áreas consultivas',
            bothPracticeAdvisory: 'Práctica y consultiva',
            introText: 'Configure proveedores de IA para habilitar Atticus. Puede agregar múltiples proveedores y cambiar entre ellos.',
            update: 'Actualizar',
            activate: 'Activar',
            removeApiKey: '¿Eliminar clave API para {provider}? Esto eliminará la configuración del proveedor.',
            resetting: 'Restableciendo...',
            reset: 'Restablecer',
            editConfiguration: 'Editar configuración',
            customize: 'Personalizar',
            saveChanges: 'Guardar Cambios',
        },

        // Settings - Practice/Advisory
        settingsAreas: {
            areaName: 'Nombre del área',
            areaDescription: 'Descripción del área',
            areaId: 'ID del Área',
            newArea: 'Nueva Área',
            newAreaDescription: 'Descripción de la nueva área',
            deleteArea: 'Eliminar área',
            pickColor: 'Elegir color',
            areaColor: 'Color del área',
            enabled: 'Habilitado',
            disabled: 'Deshabilitado',
            keywords: 'Palabras Clave',
            addKeyword: 'Agregar palabra clave',
            addKeywordPlaceholder: 'Agregar palabra clave...',
            systemPrompt: 'Indicación del Sistema',
            systemPromptPlaceholder: 'Ingrese la indicación del sistema que guiará las respuestas de IA para esta área...',
            editYaml: 'Editar YAML',
            backToList: 'Volver a la lista',
            loadFromFile: 'Cargar desde archivo',
            saveChanges: 'Guardar cambios',
            discardChanges: 'Descartar cambios',
            showMore: 'Mostrar más',
            showLess: 'Mostrar menos',
        },

        // Settings - Analysis
        settingsAnalysis: {
            analysisConfiguration: 'Configuración de Análisis',
            systemPromptLabel: 'Indicación del Sistema de Análisis',
            systemPromptPlaceholder: 'Ingrese la indicación del sistema para el análisis de respuestas...',
            emptyPromptError: 'La indicación del sistema de análisis no puede estar vacía',
            usedWhen: 'Se usa cuando: El usuario hace clic en "Analizar Grupo de Respuestas" para comparar múltiples respuestas de IA',
            resetComplete: 'La configuración ha sido restablecida a los valores de fábrica',
            whatIsResponseAnalysis: '💡 ¿Qué es el Análisis de Respuestas?',
            responseAnalysisDescription: 'Cuando recibe respuestas de múltiples modelos de IA, puede usar un modelo "juez" independiente para analizarlas y compararlas. La indicación del sistema de análisis guía a este modelo juez para evaluar la consistencia, precisión, completitud y calidad de las respuestas.',
            keyAnalysisCriteria: 'Criterios Clave de Análisis',
            consistencyDescription: '¿Las respuestas están alineadas entre sí?',
            accuracyDescription: 'Identificar inexactitudes o confabulaciones potenciales',
            completenessDescription: '¿Qué puntos importantes faltan?',
            qualityRankingDescription: 'Clasificar las respuestas de mejor a peor',
            recommendationsDescription: 'Qué respuesta(s) confiar más',
            customizationNote: '⚠️ Nota de Personalización',
            customizationDescription: 'La indicación de análisis se puede personalizar para enfatizar criterios específicos relevantes para su caso de uso (por ejemplo, precisión legal, precisión técnica, viabilidad comercial). Haga clic en "Personalizar" para editar la indicación del sistema en un editor estructurado.',
            critical: 'Crítico',
        },

        // Settings - Privacy
        settingsPrivacy: {
            privacyConfiguration: 'Configuración de Privacidad',
            piiScanningEnabled: 'Escaneo PII Habilitado',
            auditLoggingEnabled: 'Registro de Auditoría Habilitado',
            dataRetention: 'Retención de Datos',
            jurisdiction: 'Jurisdicción',
            selectJurisdiction: 'Seleccionar jurisdicción',
        },

        // Settings - About
        settingsAbout: {
            aboutAtticus: 'Acerca de Atticus',
            version: 'Versión',
            license: 'Licencia',
            copyright: 'Derechos de Autor',
            documentation: 'Documentación',
            support: 'Soporte',
        },

        // Alerts & Notifications
        alerts: {
            configureProviderFirst: 'Por favor, configure primero un proveedor de IA',
            exportFailed: 'Error al exportar PDF',
            exportSuccess: 'Exportado a PDF exitosamente',
            saveFailed: 'Error al guardar',
            saveSuccess: 'Guardado exitosamente',
            invalidApiKey: 'Por favor, introduzca una clave API válida',
            resetSuccess: 'Restablecido a valores de fábrica exitosamente',
            resetFailed: 'Error al restablecer la configuración',
            emptyPrompt: 'La indicación del sistema no puede estar vacía',
            unknownError: 'Error desconocido',
            loadFailed: 'Error al cargar el archivo de configuración',
            deleteFailed: 'Error al eliminar',
            deleteSuccess: 'Eliminado exitosamente',
            configurationReset: 'La configuración se ha restablecido a los valores de fábrica',
            enterAzureResourceName: 'Por favor, introduzca el nombre de su recurso Azure',
            factoryResetCancelled: 'Restablecimiento de fábrica cancelado',
            validationErrors: 'Se encontraron errores de validación',
        },

        // Cost Reporting
        costReport: {
            total: 'Total',
            input: 'Entrada',
            output: 'Salida',
            tokens: 'tokens',
            milliseconds: 'ms',
            duration: 'Duración',
            costBreakdown: 'Desglose de Costos',
            usageDetails: 'Detalles de Uso',
        },

        // Tags
        tags: {
            addTag: 'Agregar etiqueta',
            removeTag: 'Eliminar etiqueta',
            createNew: 'Crear nuevo',
            searchTags: 'Buscar etiquetas...',
            tagCategory: 'Categoría',
            contentType: 'Tipo de Contenido',
            priority: 'Prioridad',
            status: 'Estado',
            noTagsFound: 'No se encontraron etiquetas',
        },

        // Privacy & PII
        privacyDialog: {
            title: 'Advertencia de Privacidad',
            piiDetectedMessage: 'Se ha detectado Información Personal Identificable (PII) en su mensaje',
            continueButton: 'Continuar de Todos Modos',
            cancelButton: 'Cancelar',
            viewDetails: 'Ver Detalles',
            hideDetails: 'Ocultar Detalles',
            detectedItems: 'Elementos Detectados',
            riskLevel: 'Nivel de Riesgo',
            high: 'Alto',
            medium: 'Medio',
            low: 'Bajo',
        },

        // API Error Inspector
        apiInspector: {
            title: 'Inspector de Errores API',
            errorDetails: 'Detalles del Error',
            errorCode: 'Código de Error',
            httpStatus: 'Estado HTTP',
            message: 'Mensaje',
            request: 'Solicitud',
            response: 'Respuesta',
            headers: 'Encabezados',
            body: 'Cuerpo',
            timestamp: 'Marca de Tiempo',
        },

        // Log Viewer
        logViewer: {
            title: 'Visor de Registros',
            filters: 'Filtros',
            level: 'Nivel',
            component: 'Componente',
            search: 'Buscar',
            clear: 'Limpiar',
            export: 'Exportar',
            noLogsFound: 'No se encontraron registros',
            showingLogs: 'Mostrando registros',
        },

        // File Upload
        fileUpload: {
            uploadFailed: 'Carga Fallida',
            uploadComplete: 'Carga Completa',
            processingFile: 'Procesando Archivo',
            highRiskFileDetected: 'Archivo de Alto Riesgo Detectado',
            securityRating: 'Calificación de Seguridad',
            threatLevel: 'Nivel de Amenaza',
            detectedIssues: 'Problemas Detectados',
            warningPrefix: 'Advertencia:',
            proceedAnyway: 'Proceder de Todos Modos',
        },

        // ChatWindow
        chatWindow: {
            welcomeTitle: 'Bienvenido a Atticus',
            welcomeSubtitle: 'Seleccione una conversación o inicie una nueva',
            addTag: 'Agregar etiqueta',
            inspectError: 'Inspeccionar Error',
            resendMessage: 'Reenviar Mensaje',
            exportPDF: 'Exportar PDF',
            manageTags: 'Gestionar Etiquetas',
            analyzeResponseCluster: 'Analizar Grupo de Respuestas',
            selectModel: 'Seleccionar un modelo...',
            runAnalysis: 'Ejecutar Análisis',
            noSelection: 'Sin selección:',
            single: 'Único:',
            multiple: 'Múltiple:',
            globalLegalAnalysis: 'Análisis legal global',
            focusedAnalysis: 'Enfocado en eso',
            comparativeAnalysis: 'Análisis comparativo',
        },

        // Settings - Additional
        settingsAdditional: {
            loadingAdvisoryAreas: 'Cargando áreas de asesoramiento...',
            apiKeysNeverLeave: 'Sus claves API nunca salen de su dispositivo',
            piiScanner: 'Escáner de PII',
            legalProtectionWarning: 'Protección Legal: El escaneo de PII no puede',
            highRisk: 'Alto Riesgo',
            totalPatterns: 'Patrones Totales',
            importantPrivacyInfo: 'Información Importante sobre Privacidad',
            addNewArea: 'Agregar Nueva Área',
            consistency: 'Consistencia:',
            accuracy: 'Precisión:',
            completeness: 'Completitud:',
            qualityRanking: 'Clasificación de Calidad:',
            recommendations: 'Recomendaciones:',
        },

        // Settings - Comprehensive (Spanish translations)
        settingsContent: {
            practice: '⚖️ Práctica',
            practiceOnly: 'Solo áreas de práctica',
            advisory: '💼 Asesoramiento',
            advisoryOnly: 'Solo áreas de asesoramiento',
            both: '🔄 Ambos',
            configureModelNote: 'Configure cada modelo para áreas de práctica (legal), áreas de asesoramiento (consultoría empresarial), o ambas. Esto le permite optimizar modelos específicos según sus fortalezas.',
            viewTemplates: 'Ver Plantillas de Proveedores Disponibles',
            addProvider: 'Agregar Nuevo Proveedor de IA',
            needHelp: '¿Necesita Ayuda?',
            apiKeysStoredSecurely: '• Sus claves API se almacenan de forma segura en su máquina local',
            configureMultipleProviders: '• Puede configurar múltiples proveedores y cambiar entre ellos',
            apiCallsDirect: '• Todas las llamadas API se realizan directamente a los proveedores - sin intermediarios',
            incurCostsDirectly: '• Incurre en costos directamente con cada proveedor según el uso',
            configured: '✓ Configurado',
            active: 'Activo',
            defaultModel: 'Modelo Predeterminado',
            availableModels: 'Modelos Disponibles (marcar para habilitar, seleccionar uso de dominio)',
            selectDefaultModel: 'Seleccionar modelo predeterminado para {provider}',
            enableModel: 'Habilitar modelo {model}',
            useFor: 'Usar para:',
            azureResourceName: 'Nombre del Recurso Azure',
            resourceNamePlaceholder: 'mi-nombre-de-recurso',
            getYourApiKey: 'Obtenga su {apiKeyLabel} →',
            setAsActiveProvider: 'Establecer como Proveedor Activo',
            confirmResetFactory: '¿Está seguro de que desea restablecer la configuración {type} a los valores de fábrica?\\n\\nEsto sobrescribirá todas las personalizaciones que haya realizado.',
            practiceAreasDetection: 'Atticus detecta automáticamente el área de práctica según el contenido de su conversación. Aquí están las áreas de práctica configuradas:',
            legalPracticeAreasCoverage: 'Cobertura de Áreas de Práctica Legal',
            specializedPracticeAreas: 'áreas de práctica especializadas con',
            automaticAreaDetection: '• Detección automática del área y orientación legal contextual',
            coversLegalDomains: '• Cubre derecho corporativo, propiedad intelectual, derecho laboral, contratos, cumplimiento, privacidad, y más',
            advisoryCapabilities: 'Atticus proporciona capacidades integrales de asesoramiento empresarial para complementar los servicios legales. El sistema detecta automáticamente los temas de asesoramiento y ajusta la orientación en consecuencia.',
            businessAdvisoryCoverage: 'Cobertura de Asesoramiento Empresarial',
            specializedAdvisoryAreas: 'áreas de asesoramiento especializadas con',
            automaticTopicDetection: '• Detección automática de temas y orientación contextual',
            coversAdvisoryDomains: '• Cubre estrategia, finanzas, marketing, operaciones, RRHH, tecnología, riesgos, sostenibilidad y fusiones y adquisiciones',
            complementsLegalAreas: '• Complementa las áreas de práctica legal para un soporte empresarial integral',
            updateAvailable: 'Actualización Disponible',
            dismiss: 'Descartar',
            responseAnalysisConfig: '🔍 Configuración del Análisis de Respuestas',
            configureAnalysisPrompt: 'Configure la instrucción del sistema utilizada para la validación y análisis de respuestas de múltiples modelos. Esta instrucción guía al analista de calidad de IA al comparar respuestas de diferentes modelos.',
            analysisSystemPrompt: 'Instrucción del Sistema de Análisis',
            definesAnalysis: 'Define cómo los modelos de IA analizan y comparan respuestas en términos de coherencia, precisión y calidad.',
            currentConfiguration: 'Configuración Actual',
            sourceAnalysisYaml: 'Fuente: analysis.yaml',
            configuredPromptInfo: '[Instrucción del sistema configurada para análisis de respuestas]',
            usedWhen: 'Usado cuando: El usuario hace clic en "Analizar Grupo de Respuestas" para comparar múltiples respuestas de IA usando un modelo independiente.',
            whatIsResponseAnalysis: '💡 ¿Qué es el Análisis de Respuestas?',
            responseAnalysisExplanation: 'Cuando recibe respuestas de múltiples modelos de IA, puede usar un modelo "juez" independiente para analizarlas y compararlas. La instrucción del sistema de análisis guía a este modelo juez para evaluar la coherencia, precisión, completitud y calidad de las respuestas.',
            keyAnalysisCriteria: 'Criterios Clave de Análisis',
            consistencyCheck: '1. Coherencia: ¿Están las respuestas alineadas entre sí?',
            accuracyCheck: '2. Precisión: Identificar posibles inexactitudes o confabulaciones',
            completenessCheck: '3. Completitud: ¿Qué puntos importantes faltan?',
            qualityRankingCheck: '4. Clasificación de Calidad: Clasificar respuestas de mejor a peor',
            recommendationsCheck: '5. Recomendaciones: ¿En qué respuesta(s) confiar más?',
            customizationNote: '⚠️ Nota de Personalización',
            customizationExplanation: 'La instrucción de análisis puede personalizarse para enfatizar criterios específicos relevantes para su caso de uso (por ejemplo, precisión legal, precisión técnica, viabilidad empresarial). Haga clic en "Personalizar" para editar la instrucción del sistema en un editor estructurado.',
            configurationLoadError: 'Error de Carga de Configuración',
            copyright: 'Copyright © 2025, John Kost, Todos los Derechos Reservados',
            copyrightVersion: 'Copyright © 2025, John Kost, Todos los Derechos Reservados | v{version}',
            europe: 'Europa',
            coverage: 'Cobertura',
            ourMission: '🎯 Nuestra Misión',
            missionStatement: 'Atticus tiene como objetivo democratizar el acceso a servicios de asesoramiento legal y empresarial de alta calidad combinando la inteligencia artificial con una experiencia integral en el dominio. Creemos que los emprendedores, startups y empresas de todos los tamaños merecen orientación legal y estratégica sofisticada para navegar el complejo panorama regulatorio y empresarial actual.',
            globalCoverage: '🌍 Cobertura Global',
            globalCoverageDescription: 'Atticus proporciona soporte especializado para startups y empresas que operan en:',
            comprehensiveCapabilities: '⚡ Capacidades Integrales',
            legalPracticeAreas: 'Áreas de Práctica Legal',
            corporateBusinessLaw: '• Derecho Corporativo y Empresarial',
            intellectualProperty: '• Propiedad Intelectual',
            employmentLaborLaw: '• Derecho Laboral y del Empleo',
            startupEntrepreneurship: '• Startup y Emprendimiento',
            ventureCapitalFinance: '• Capital de Riesgo y Finanzas',
            crossBorderOperations: '• Operaciones Transfronterizas',
            privacyDataProtection: '• Privacidad y Protección de Datos',
            andMoreAreas: '• Y 60 áreas especializadas más',
            businessAdvisoryAreas: 'Áreas de Asesoramiento Empresarial',
            strategicPlanning: '• Planificación Estratégica y Estrategia Empresarial',
            financialAdvisory: '• Asesoramiento Financiero y Finanzas Corporativas',
            marketingStrategy: '• Estrategia de Marketing y Desarrollo de Marca',
            governmentRelations: '• Relaciones Gubernamentales y Política Pública',
            productLegalCompliance: '• Cumplimiento Legal de Productos',
            maAdvisory: '• Asesoramiento en Fusiones y Adquisiciones y Planificación de Salida',
            digitalTransformation: '• Transformación Digital y Tecnología',
            totalExpertiseCoverage: '🎯 Cobertura Total de Experiencia:',
            specializedAreas: '134 Áreas Especializadas',
            dualMode: 'Modo Dual Práctica + Asesoramiento',
            builtForStartups: '🚀 Diseñado para Startups',
            startupOptimization: 'Con 90% de optimización para necesidades de startup y emprendimiento, Atticus cubre todo el ciclo de vida de las startups:',
            ideaStage: 'Etapa de Idea',
            entityFormation: 'Formación de Entidad',
            seedStage: 'Etapa de Semilla',
            fundraising: 'Recaudación de Fondos',
            growthStage: 'Etapa de Crecimiento',
            scaling: 'Escalamiento',
            exitStage: 'Etapa de Salida',
            maIpo: 'Fusiones y Adquisiciones / OPV',
            privacyFirst: '🔒 Arquitectura Centrada en la Privacidad',
            allDataLocal: '✓ Todos los datos almacenados localmente en su máquina - sin almacenamiento en la nube',
            apiCallsDirectNoIntermed: '✓ Llamadas API realizadas directamente a sus proveedores elegidos - sin intermediarios',
            fullDataControl: '✓ Control total sobre sus datos y conversaciones (incluidos los gastos de API)',
            importantDisclaimer: '⚠️ Descargo de Responsabilidad Importante',
            disclaimerText: 'Atticus es un asistente impulsado por IA diseñado para proporcionar información y orientación general. No proporciona asesoramiento legal, y sus resultados no deben considerarse como un sustituto de la consulta con profesionales legales o comerciales calificados. Siempre consulte con abogados, contadores u otros asesores calificados para asuntos legales, fiscales o comerciales específicos que afecten su situación.',
            systemStatistics: 'Estadísticas del Sistema',
            totalPracticeAreas: 'Total de Áreas de Práctica:',
            totalAdvisoryAreas: 'Total de Áreas de Asesoramiento:',
            totalKeywords: 'Total de Palabras Clave:',
            supportedProviders: 'Proveedores Soportados:',
            providersAvailableConfigured: 'disponibles, configurados',
            builtWith: 'Construido Con',
            reactTypescript: '⚛️ React + TypeScript',
            electronApp: '⚡ Aplicación de Escritorio Electron',
            tailwindCss: '🎨 Tailwind CSS',
            multiProviderAi: '🤖 Integración de IA Multi-Proveedor',
            piiScanningTitle: '🔒 Privacidad y Escaneo de PII',
            piiScanningDescription: 'Escaneo de PII (Información de Identificación Personal) para ayudar a proteger sus datos sensibles antes de enviarlos a proveedores de IA.',
            alwaysEnabled: 'SIEMPRE HABILITADO',
            automaticallyScans: 'Escanea automáticamente sus mensajes en busca de información sensible como números de seguro social, tarjetas de crédito, correos electrónicos, números de teléfono y más antes de enviarlos a proveedores de IA.',
            legalProtectionFull: 'Protección Legal: El escaneo de PII no se puede deshabilitar. Esta característica de seguridad obligatoria lo protege a usted y a Atticus de responsabilidad al garantizar que siempre se le advierta antes de compartir datos sensibles.',
            scannerCoverage: 'Cobertura del Escáner',
            critical: 'Crítico',
            moderate: 'Moderado',
            highRisk: 'Alto Riesgo',
            totalPatterns: 'Patrones Totales',
            whatGetsDetected: 'Qué se Detecta',
            examplesOfSensitiveData: 'Ejemplos de patrones de datos sensibles que se escanean automáticamente:',
            criticalRisk: 'Riesgo Crítico',
            usSsn: '• Números de Seguro Social de EE. UU. (SSN)',
            canadianSin: '• Seguro Social Canadiense (SIN)',
            mexicanCurp: '• Números CURP Mexicanos',
            mexicanRfc: '• RFC Mexicano (ID Fiscal)',
            euUkNationalId: '• Números de Identificación Nacional EU/UK',
            creditCards: '• Números de Tarjeta de Crédito (Todos los Tipos)',
            passwordsCredentials: '• Contraseñas y Credenciales',
            apiKeysTokens: '• Claves API y Tokens de Acceso',
            highRiskCategory: 'Alto Riesgo',
            ibanAccounts: '• Números de Cuenta IBAN (EU/UK)',
            clabeCodes: '• Códigos CLABE (México)',
            canadianHealthCard: '• Números de Tarjeta de Salud Canadiense',
            euVatNumbers: '• Números de IVA de la UE',
            passportNumbers: '• Números de Pasaporte',
            emailAddresses: '• Direcciones de Correo Electrónico',
            phoneNumbers: '• Números de Teléfono (Internacional)',
            bankAccounts: '• Números de Cuenta Bancaria',
            usRoutingNumbers: '• Números de Ruta de EE. UU.',
            canadianTransitNumbers: '• Números de Tránsito Canadienses',
            swiftBicCodes: '• Códigos SWIFT/BIC',
            medicalRecordNumbers: '• Números de Registro Médico',
            moderateRisk: 'Riesgo Moderado',
            driversLicense: '• Números de Licencia de Conducir',
            taxIdsEins: '• Identificadores Fiscales / EIN',
            legalCaseNumbers: '• Números de Caso Legal',
            streetAddresses: '• Direcciones de Calle',
            zipPostalCodes: '• Códigos Postales',
            ipAddresses: '• Direcciones IP (IPv4/IPv6)',
            fullNamesWithTitles: '• Nombres Completos con Títulos',
            patternsNote: 'Nota: Los anteriores son ejemplos representativos. El escáner utiliza {count} patrones totales que cubren variaciones y formatos adicionales.',
            patterns: 'Patrones',
            importantPrivacyInfoTitle: 'ℹ️ Información Importante sobre Privacidad',
            detectionLocal: '✓ Toda la detección de PII ocurre localmente en su dispositivo - no se envían datos externamente',
            scannerWarningsOnly: '✓ El escáner proporciona advertencias pero no puede evitar que envíe datos',
            userResponsibility: '✓ Usted es en última instancia responsable de proteger la información confidencial',
            reviewProviderPolicies: '✓ Cada proveedor de IA tiene diferentes políticas de privacidad - revíselas cuidadosamente',
            useExampleData: '✓ Considere usar datos de ejemplo o anonimizar detalles para consultas sensibles',
            noDataCollection: '✓ Los desarrolladores de Atticus nunca recopilan, almacenan ni tienen acceso a sus datos',
            editConfiguration: 'Editar Configuración',
            editAnalysisPrompt: 'Editar Instrucción de Análisis',
            editInstructions: 'Edite la instrucción del sistema de análisis a continuación. Esta instrucción guía al analista de calidad de IA al comparar respuestas de diferentes modelos.',
            analysisPromptLabel: 'Instrucción del Sistema de Análisis',
            characterCount: 'caracteres',
            yamlEditInstructions: 'Edite la configuración a continuación. Los cambios tendrán efecto después de reiniciar Atticus.',
            idReadOnly: 'ID (solo lectura)',
            name: 'Nombre',
            description: 'Descripción',
            color: 'Color',
            systemPrompt: 'Instrucción del Sistema',
            systemPromptHelp: 'Esta instrucción define la experiencia, el enfoque y las directrices de la IA al responder a consultas en esta área.',
            keywords: 'Palabras Clave',
            noKeywordsYet: 'No se han agregado palabras clave aún',
            addKeyword: 'Agregar',
            deleteArea: 'Eliminar Área',
            collapse: 'Contraer',
            expand: 'Expandir',
            file: 'Archivo:',
            addNewArea: 'Agregar Nueva Área',
        },

        // Conversation Cost Ledger
        conversationCostLedger: {
            title: 'Libro de Costos',
            conversation: 'Conversación',
            totalSpent: 'Total Gastado',
            breakdown: 'Desglose',
            byProvider: 'Por Proveedor',
            byModel: 'Por Modelo',
            byDate: 'Por Fecha',
            details: 'Detalles',
        },

        // Time & Date
        time: {
            justNow: 'Justo ahora',
            minuteAgo: 'Hace 1 minuto',
            minutesAgo: 'Hace {n} minutos',
            hourAgo: 'Hace 1 hora',
            hoursAgo: 'Hace {n} horas',
            dayAgo: 'Hace 1 día',
            daysAgo: 'Hace {n} días',
            weekAgo: 'Hace 1 semana',
            weeksAgo: 'Hace {n} semanas',
            monthAgo: 'Hace 1 mes',
            monthsAgo: 'Hace {n} meses',
            yearAgo: 'Hace 1 año',
            yearsAgo: 'Hace {n} años',
        },
    },
};

export function getTranslations(language: Language): Translations {
    return translations[language];
}
