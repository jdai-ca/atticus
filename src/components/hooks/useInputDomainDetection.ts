import { useEffect } from 'react';
import { detectPracticeArea } from '../../modules/practiceArea';
import { detectAdvisoryArea } from '../../modules/advisoryArea';

interface UseInputDomainDetectionParams {
  readonly input: string;
  readonly setCurrentDomain: (domain: 'practice' | 'advisory' | undefined) => void;
}

export function useInputDomainDetection({
  input,
  setCurrentDomain,
}: UseInputDomainDetectionParams): void {
  useEffect((): void => {
    if (!input.trim()) {
      setCurrentDomain(undefined);
      return;
    }

    const practiceArea = detectPracticeArea(input);
    const advisoryArea = detectAdvisoryArea(input);

    if (advisoryArea.id === 'general-advisory') {
      if (practiceArea.id === 'general') {
        setCurrentDomain(undefined);
      } else {
        setCurrentDomain('practice');
      }
    } else {
      setCurrentDomain('advisory');
    }
  }, [input, setCurrentDomain]);
}
