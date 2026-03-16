import { createContext, useContext, ReactNode } from "react";
import { Language, Translations, getTranslations } from "./translations";

interface LanguageContextType {
  language: Language;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

interface LanguageProviderProps {
  language: Language;
  children: ReactNode;
}

export function LanguageProvider({
  language,
  children,
}: LanguageProviderProps) {
  const t = getTranslations(language);

  return (
    <LanguageContext.Provider value={{ language, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
