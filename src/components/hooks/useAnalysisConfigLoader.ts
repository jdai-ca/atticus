import { useEffect, useState } from 'react';
import yaml from 'js-yaml';
import { createLogger } from '../../services/debugLogger';

interface AnalysisConfig {
  readonly systemPrompt: string;
}

interface UseAnalysisConfigLoaderParams {
  readonly language: string;
}

interface UseAnalysisConfigLoaderResult {
  readonly analysisConfig: AnalysisConfig | null;
}

const logger = createLogger('useAnalysisConfigLoader');

export function useAnalysisConfigLoader({
  language,
}: UseAnalysisConfigLoaderParams): UseAnalysisConfigLoaderResult {
  const [analysisConfig, setAnalysisConfig] = useState<AnalysisConfig | null>(null);

  useEffect((): void => {
    const loadAnalysisConfig = async (): Promise<void> => {
      try {
        const filename = `analysis.${language}.yaml`;
        const fallbackFilename = 'analysis.en.yaml';

        let result = await globalThis.window.electronAPI.loadBundledConfig(filename);

        if (!result.success && language !== 'en') {
          logger.debug('Language-specific analysis config not found, falling back to English', {
            language,
          });
          result = await globalThis.window.electronAPI.loadBundledConfig(fallbackFilename);
        }

        if (result.success && result.data) {
          const parsed = yaml.load(result.data) as { analysis?: { systemPrompt?: string } } | null;
          if (parsed?.analysis?.systemPrompt) {
            setAnalysisConfig({
              systemPrompt: parsed.analysis.systemPrompt,
            } satisfies AnalysisConfig);
            logger.info('Analysis configuration loaded successfully', {
              language,
            });
          }
        }
      } catch (error) {
        logger.error('Failed to load analysis configuration', {
          error,
          language,
        });
        setAnalysisConfig({
          systemPrompt:
            'You are a legal AI quality analyst. Analyze the following responses to a user query for accuracy, consistency, and potential confabulations.',
        } satisfies AnalysisConfig);
      }
    };

    loadAnalysisConfig();
  }, [language]);

  return {
    analysisConfig,
  } satisfies UseAnalysisConfigLoaderResult;
}
