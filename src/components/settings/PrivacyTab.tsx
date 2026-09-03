import { useTranslation } from '../../i18n/LanguageContext';
import { piiScanner } from '../../services/piiScanner';

export function PrivacyTab() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-bold text-white mb-2">{t.settingsContent.piiScanningTitle}</h3>
        <p className="text-gray-400 text-sm">{t.settingsContent.piiScanningDescription}</p>
      </div>

      {/* PII Scanner - ALWAYS ENABLED Notice */}
      <div className="bg-gray-900 rounded-lg p-6 mb-6 border-2 border-green-700">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <span>🛡️</span>
              <span>{t.settingsAdditional.piiScanner}</span>
              <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1 rounded border border-green-700 font-bold">
                {t.settingsContent.alwaysEnabled}
              </span>
            </h4>
            <p className="text-gray-400 text-sm mb-2">{t.settingsContent.automaticallyScans}</p>
            <div className="bg-yellow-900/20 border border-yellow-700 rounded p-3 mt-3">
              <p className="text-yellow-300 text-xs font-medium flex items-start gap-2">
                <span>⚠️</span>
                <span>{t.settingsContent.legalProtectionFull}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Scanner Statistics - Always visible */}
        <div className="bg-gray-800 rounded p-4 border border-gray-700">
          <h5 className="text-sm font-semibold text-gray-300 mb-3">
            {t.settingsContent.scannerCoverage}
          </h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {(() => {
              const stats = piiScanner.getStatistics();
              return (
                <>
                  <div className="bg-red-900/20 border border-red-800 rounded p-2">
                    <div className="text-red-400 font-bold text-lg">{stats.criticalPatterns}</div>
                    <div className="text-red-300">{t.settingsAnalysis.critical}</div>
                  </div>
                  <div className="bg-orange-900/20 border border-orange-800 rounded p-2">
                    <div className="text-orange-400 font-bold text-lg">{stats.highPatterns}</div>
                    <div className="text-orange-300">{t.settingsContent.highRisk}</div>
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-800 rounded p-2">
                    <div className="text-yellow-400 font-bold text-lg">
                      {stats.moderatePatterns}
                    </div>
                    <div className="text-yellow-300">{t.settingsContent.moderate}</div>
                  </div>
                  <div className="bg-blue-900/20 border border-blue-800 rounded p-2">
                    <div className="text-blue-400 font-bold text-lg">{stats.totalPatterns}</div>
                    <div className="text-blue-300">{t.settingsContent.totalPatterns}</div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* What Gets Detected - Always visible */}
      <div className="bg-gray-900 rounded-lg p-6 border-2 border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-4">
          {t.settingsContent.whatGetsDetected}
        </h4>
        <p className="text-gray-400 text-sm mb-4">{t.settingsContent.examplesOfSensitiveData}</p>

        <div className="space-y-4">
          {/* Critical */}
          <div>
            <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
              <span>🔴</span>
              <span>
                {t.settingsContent.criticalRisk} ({piiScanner.getStatistics().criticalPatterns}{' '}
                {t.settingsContent.patterns})
              </span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.usSsn}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.canadianSin}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.mexicanCurp}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.mexicanRfc}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.euUkNationalId}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.creditCards}</div>
              <div className="bg-gray-800 rounded p-2">
                {t.settingsContent.passwordsCredentials}
              </div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.apiKeysTokens}</div>
            </div>
          </div>

          {/* High */}
          <div>
            <h5 className="text-sm font-semibold text-orange-400 mb-2 flex items-center gap-2">
              <span>🟠</span>
              <span>
                {t.settingsContent.highRiskCategory} ({piiScanner.getStatistics().highPatterns}{' '}
                {t.settingsContent.patterns})
              </span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.ibanAccounts}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.clabeCodes}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.canadianHealthCard}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.euVatNumbers}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.passportNumbers}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.emailAddresses}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.phoneNumbers}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.bankAccounts}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.usRoutingNumbers}</div>
              <div className="bg-gray-800 rounded p-2">
                {t.settingsContent.canadianTransitNumbers}
              </div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.swiftBicCodes}</div>
              <div className="bg-gray-800 rounded p-2">
                {t.settingsContent.medicalRecordNumbers}
              </div>
            </div>
          </div>

          {/* Moderate */}
          <div>
            <h5 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
              <span>🟡</span>
              <span>
                {t.settingsContent.moderateRisk} ({piiScanner.getStatistics().moderatePatterns}{' '}
                {t.settingsContent.patterns})
              </span>
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-300">
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.driversLicense}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.taxIdsEins}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.legalCaseNumbers}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.streetAddresses}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.zipPostalCodes}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.ipAddresses}</div>
              <div className="bg-gray-800 rounded p-2">{t.settingsContent.fullNamesWithTitles}</div>
            </div>
          </div>
        </div>

        <div className="mt-4 text-xs text-gray-400 italic">
          {t.settingsContent.patternsNote.replace(
            '{count}',
            piiScanner.getStatistics().totalPatterns.toString()
          )}
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <span>ℹ️</span>
          <span>{t.settingsContent.importantPrivacyInfoTitle}</span>
        </h4>
        <ul className="text-xs text-blue-200 space-y-1 list-disc list-inside">
          <li>{t.settingsContent.detectionLocal}</li>
          <li>{t.settingsContent.scannerWarningsOnly}</li>
          <li>{t.settingsContent.userResponsibility}</li>
          <li>{t.settingsContent.reviewProviderPolicies}</li>
          <li>{t.settingsContent.useExampleData}</li>
          <li>{t.settingsContent.noDataCollection}</li>
        </ul>
      </div>
    </div>
  );
}
