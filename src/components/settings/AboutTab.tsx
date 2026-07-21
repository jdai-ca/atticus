import { AppConfig, ProviderTemplate } from '../../types/index';
import { useTranslation } from '../../i18n/LanguageContext';
import { JURISDICTIONS } from '../../config/jurisdictions';
import packageJson from '../../../package.json';

interface AboutTabProps {
  config: AppConfig;
  providerTemplates: ProviderTemplate[];
}

export function AboutTab({ config, providerTemplates }: AboutTabProps) {
  const { t } = useTranslation();

  return (
    <div>
      {/* Copyright Notice */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 mb-6 text-center">
        <p className="text-sm text-gray-400">
          {t.settingsContent.copyrightVersion.replace('{version}', packageJson.version)}
        </p>
      </div>

      <div className="space-y-6">
        {/* Mission Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-3">{t.settingsContent.ourMission}</h3>
          <p className="text-gray-300 leading-relaxed">{t.settingsContent.missionStatement}</p>
        </div>

        {/* Coverage Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-3">{t.settingsContent.globalCoverage}</h3>
          <p className="text-gray-300 mb-3">{t.settingsContent.globalCoverageDescription}</p>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {JURISDICTIONS.map(
              (jurisdiction): JSX.Element => (
                <div key={jurisdiction.code} className="bg-gray-800 rounded p-3 text-center">
                  <div className="text-2xl mb-2">{jurisdiction.flag}</div>
                  <div className="text-sm font-semibold text-white">
                    {jurisdiction.name === 'European Union'
                      ? t.settingsContent.europe
                      : jurisdiction.name}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {jurisdiction.coverage}% {t.settingsContent.coverage}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Capabilities Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-3">
            {t.settingsContent.comprehensiveCapabilities}
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300">
                  {t.settingsContent.legalPracticeAreas}
                </h4>
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                  67
                </span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>{t.settingsContent.corporateBusinessLaw}</li>
                <li>{t.settingsContent.intellectualProperty}</li>
                <li>{t.settingsContent.employmentLaborLaw}</li>
                <li>{t.settingsContent.startupEntrepreneurship}</li>
                <li>{t.settingsContent.ventureCapitalFinance}</li>
                <li>{t.settingsContent.crossBorderOperations}</li>
                <li>{t.settingsContent.privacyDataProtection}</li>
                <li>{t.settingsContent.andMoreAreas}</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-300">
                  {t.settingsContent.businessAdvisoryAreas}
                </h4>
                <span className="bg-purple-600 text-white text-xs font-bold px-2 py-1 rounded">
                  67
                </span>
              </div>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>{t.settingsContent.strategicPlanning}</li>
                <li>{t.settingsContent.financialAdvisory}</li>
                <li>{t.settingsContent.marketingStrategy}</li>
                <li>{t.settingsContent.governmentRelations}</li>
                <li>{t.settingsContent.productLegalCompliance}</li>
                <li>{t.settingsContent.maAdvisory}</li>
                <li>{t.settingsContent.digitalTransformation}</li>
                <li>{t.settingsContent.andMoreAreas}</li>
              </ul>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 rounded-lg p-3 border border-blue-700/30">
            <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
              <span className="font-semibold">{t.settingsContent.totalExpertiseCoverage}</span>
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold px-3 py-1 rounded">
                {t.settingsContent.specializedAreas}
              </span>
              <span className="text-gray-400">{t.settingsContent.dualMode}</span>
            </div>
          </div>
        </div>

        {/* Startup Focus Section */}
        <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 rounded-lg p-6 border border-purple-700">
          <h3 className="text-xl font-bold text-white mb-3">
            {t.settingsContent.builtForStartups}
          </h3>
          <p className="text-gray-300 mb-3">{t.settingsContent.startupOptimization}</p>
          <div className="flex justify-between items-center bg-gray-900/50 rounded p-4">
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">{t.settingsContent.ideaStage}</div>
              <div className="text-sm text-white font-semibold">
                {t.settingsContent.entityFormation}
              </div>
            </div>
            <div className="text-gray-600">→</div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">{t.settingsContent.seedStage}</div>
              <div className="text-sm text-white font-semibold">
                {t.settingsContent.fundraising}
              </div>
            </div>
            <div className="text-gray-600">→</div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">{t.settingsContent.growthStage}</div>
              <div className="text-sm text-white font-semibold">{t.settingsContent.scaling}</div>
            </div>
            <div className="text-gray-600">→</div>
            <div className="text-center flex-1">
              <div className="text-xs text-gray-400 mb-1">{t.settingsContent.exitStage}</div>
              <div className="text-sm text-white font-semibold">{t.settingsContent.maIpo}</div>
            </div>
          </div>
        </div>

        {/* Privacy & Security Section */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-3">{t.settingsContent.privacyFirst}</h3>
          <ul className="text-sm text-gray-300 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">✓</span>
              <span>{t.settingsContent.allDataLocal}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">✓</span>
              <span>{t.settingsContent.apiCallsDirectNoIntermed}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">✓</span>
              <span>{t.settingsContent.lockedSafetyScanner}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">✓</span>
              <span>{t.settingsAdditional.apiKeysNeverLeave}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-gray-400 mt-0.5">✓</span>
              <span>{t.settingsContent.fullDataControl}</span>
            </li>
          </ul>
        </div>

        {/* Disclaimer Section */}
        <div className="bg-yellow-900/20 rounded-lg p-6 border border-yellow-700/50">
          <h3 className="text-xl font-bold text-yellow-400 mb-3">
            {t.settingsContent.importantDisclaimer}
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed">
            {t.settingsContent.disclaimerText}
          </p>
        </div>

        {/* Version & Stats */}
        <div className="bg-gray-900 rounded-lg p-6 border border-gray-700">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                {t.settingsContent.systemStatistics}
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>
                  {t.settingsContent.totalPracticeAreas}{' '}
                  <span className="text-gray-300 font-semibold">
                    {config.legalPracticeAreas?.length || 0}
                  </span>
                </li>
                <li>
                  {t.settingsContent.totalAdvisoryAreas}{' '}
                  <span className="text-gray-300 font-semibold">
                    {config.advisoryAreas?.length || 0}
                  </span>
                </li>
                <li>
                  {t.settingsContent.totalKeywords}{' '}
                  <span className="text-gray-300 font-semibold">
                    {(
                      (config.legalPracticeAreas?.reduce(
                        (sum, area) => sum + (area.keywords?.length || 0),
                        0
                      ) || 0) +
                      (config.advisoryAreas?.reduce(
                        (sum, area) => sum + (area.keywords?.length || 0),
                        0
                      ) || 0)
                    ).toLocaleString()}
                  </span>
                </li>
                <li>
                  {t.settingsContent.supportedProviders}{' '}
                  <span className="text-gray-300 font-semibold">
                    {providerTemplates.length}{' '}
                    {t.settingsContent.providersAvailableConfigured.split(',')[0]},{' '}
                    {config.providers.length}{' '}
                    {t.settingsContent.providersAvailableConfigured.split(',')[1]}
                  </span>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-400 mb-2">
                {t.settingsContent.builtWith}
              </h4>
              <ul className="text-xs text-gray-300 space-y-1">
                <li>{t.settingsContent.reactTypescript}</li>
                <li>{t.settingsContent.electronApp}</li>
                <li>{t.settingsContent.tailwindCss}</li>
                <li>{t.settingsContent.multiProviderAi}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
