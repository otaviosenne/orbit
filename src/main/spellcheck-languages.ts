import { session } from 'electron';

// Otavio writes in Portuguese with English terms mixed in; left alone, Electron checks only the system locale
// (en-US here), so every Portuguese word got the red underline. The dictionaries download on first use.
const SPELLCHECK_LANGUAGES: readonly string[] = ['pt-BR', 'en-US'];

export function useSpellcheckLanguages(): void {
  const available: readonly string[] = session.defaultSession.availableSpellCheckerLanguages;
  const languages: string[] = SPELLCHECK_LANGUAGES.filter((language: string) => available.includes(language));
  if (languages.length > 0) session.defaultSession.setSpellCheckerLanguages(languages);
}
