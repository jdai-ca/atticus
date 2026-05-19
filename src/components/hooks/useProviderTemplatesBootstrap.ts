import { useEffect } from "react";

interface UseProviderTemplatesBootstrapParams {
  readonly providerTemplatesLength: number;
  readonly loadProviderTemplates: () => void;
}

export function useProviderTemplatesBootstrap({
  providerTemplatesLength,
  loadProviderTemplates,
}: UseProviderTemplatesBootstrapParams): void {
  useEffect((): void => {
    if (providerTemplatesLength === 0) {
      loadProviderTemplates();
    }
  }, [providerTemplatesLength, loadProviderTemplates]);
}