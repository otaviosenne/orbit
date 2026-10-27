import type { VoiceCommand } from './voice-command';

export type Phrase = readonly string[];

export interface PhraseRule {
  readonly command: VoiceCommand;
  readonly phrases: readonly Phrase[];
  // Matched with the spaces left out, for words dictation splits or glues unpredictably.
  readonly gluedPhrases?: readonly string[];
  // The rule acts only once nothing changes for this long. For words people say in ordinary sentences, so a pause
  // after them is what shows they ended the message.
  readonly afterPauseMs?: number;
}

// Silence after "pode enviar" and the like before the message goes out.
export const SEND_PAUSE_MS: number = 1000;

// Words no prompt ends with by accident. This table is the one place to change them; longer forms come first so all
// of their words are removed. Rules are tried in order. Words are bare: lowercase, no accents or punctuation.
export const PHRASE_RULES: readonly PhraseRule[] = [
  {
    command: { action: 'clear' },
    phrases: [['orbit', 'clear'], ['orbit', 'limpar'], ['chat', 'clear'], ['chat', 'limpar']],
  },
  {
    command: { action: 'send' },
    phrases: [
      ['orbit', 'enviar'],
      ['chinelo', 'chinelo'],
      ['chinelo'],
      // Whole words only: "flipping" or "flipped" end no command.
      ['flipper'],
      ['flippa'],
      ['flip'],
    ],
    // Known mis-transcriptions of "Orbit enviar" ("Orbit VR", "Orbit In VR", "Orbit em VR", "Orbiting VR", "OrbitInVR", "RBTVR", "Arbitinho VR", "Arbitrinho VR", however spaced): add any
    // new variant here.
    gluedPhrases: ['orbitinvr', 'orbitingvr', 'orbitemvr', 'orbitvr', 'rbtvr', 'arbitinhovr', 'arbitrinhovr'],
  },
  {
    command: { action: 'send' },
    afterPauseMs: SEND_PAUSE_MS,
    phrases: [
      ['pode', 'enviar', 'mensagem'],
      ['pode', 'mandar', 'mensagem'],
      ['pode', 'enviar'],
      ['pode', 'mandar'],
      ['enviar', 'mensagem'],
      ['mandar', 'mensagem'],
      ['enviar'],
      ['mandar'],
      ['envia'],
      ['manda'],
      ['send', 'message'],
      ['send', 'it'],
    ],
  },
  { command: { action: 'view', view: 'board' }, phrases: [['orbit', 'board']] },
  { command: { action: 'view', view: 'grid' }, phrases: [['orbit', 'panel'], ['orbit', 'painel'], ['orbit', 'grid']] },
  { command: { action: 'view', view: 'timeline' }, phrases: [['orbit', 'timeline'], ['orbit', 'linha', 'do', 'tempo']] },
  { command: { action: 'view', view: 'list' }, phrases: [['orbit', 'list'], ['orbit', 'lista']] },
  { command: { action: 'view', view: 'settings' }, phrases: [['orbit', 'settings'], ['orbit', 'configuracoes'], ['orbit', 'configuracao']] },
  // The open chat's Emulator or Browser pill: nothing happens when it has none.
  { command: { action: 'device', device: 'emulator' }, phrases: [['orbit', 'emulador'], ['orbit', 'emulator']] },
  { command: { action: 'device', device: 'browser' }, phrases: [['orbit', 'navegador'], ['orbit', 'browser']] },
  { command: { action: 'new-chat' }, phrases: [['orbit', 'new', 'chat'], ['orbit', 'novo', 'chat'], ['orbit', 'nova', 'conversa']] },
  { command: { action: 'resume' }, phrases: [['orbit', 'resume'], ['orbit', 'retomar']] },
  {
    command: { action: 'cancel' },
    phrases: [['orbit', 'cancelar'], ['orbit', 'cancel'], ['orbit', 'fechar'], ['orbit', 'close'], ['orbit', 'voltar'], ['orbit', 'back']],
  },
];

// Words before a number, longest first so "orbit chat 3" leaves nothing of the phrase behind.
export const NUMBER_PREFIXES: readonly Phrase[] = [['orbit', 'chat'], ['orbit'], ['chat']];
