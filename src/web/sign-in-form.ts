import { element } from '../renderer/dom';
import { renderWordmark } from '../renderer/wordmark';
import type { SignInOutcome } from './session';
import { signIn, takePairingToken } from './session';

const OUTCOME_MESSAGES: Readonly<Record<Exclude<SignInOutcome, 'ok'>, string>> = {
  wrong: 'That token is not right. Copy it again from Orbit’s Settings on your computer.',
  locked: 'Too many wrong tokens. Sign-in is paused for a while.',
  unreachable: 'Orbit is not answering. Is the computer on, with Orbit Web enabled?',
};

// A full-screen card over the (still hidden) app; resolves once the server accepted a token.
export function showSignInForm(): Promise<void> {
  return new Promise((resolve: () => void): void => {
    const overlay: HTMLDivElement = element('div', 'web-sign-in');
    const form: HTMLFormElement = element('form', 'web-sign-in-card');
    const title: HTMLDivElement = element('div', 'web-sign-in-title');
    renderWordmark(title);
    const input: HTMLInputElement = element('input', 'web-sign-in-input');
    input.type = 'password';
    input.autocomplete = 'current-password';
    input.placeholder = 'Access token';
    input.setAttribute('aria-label', 'Access token');
    const submit: HTMLButtonElement = element('button', 'button button-primary web-sign-in-submit', 'Sign in');
    submit.type = 'submit';
    const problem: HTMLParagraphElement = element('p', 'web-sign-in-problem');
    problem.setAttribute('role', 'alert');
    const hint: string = 'Paste the access token from Orbit → Settings → Orbit Web, or scan its QR code.';
    form.append(title, element('p', 'web-sign-in-hint', hint), input, submit, problem);
    overlay.append(form);
    document.body.append(overlay);
    input.focus();
    const tryToken = (token: string): void =>
      void attempt(token, submit, problem).then((ok: boolean): void => {
        if (!ok) return;
        window.removeEventListener('hashchange', onPairingLink);
        overlay.remove();
        resolve();
      });
    // Opening the pairing link again in this same tab only changes the fragment, which reloads nothing.
    const onPairingLink = (): void => {
      const token: string | null = takePairingToken();
      if (token !== null) tryToken(token);
    };
    window.addEventListener('hashchange', onPairingLink);
    form.addEventListener('submit', (event: SubmitEvent): void => {
      event.preventDefault();
      tryToken(input.value);
    });
  });
}

async function attempt(token: string, submit: HTMLButtonElement, problem: HTMLElement): Promise<boolean> {
  submit.disabled = true;
  const outcome: SignInOutcome = await signIn(token);
  submit.disabled = false;
  problem.textContent = outcome === 'ok' ? '' : OUTCOME_MESSAGES[outcome];
  return outcome === 'ok';
}
