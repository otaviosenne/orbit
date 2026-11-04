import type { ShutdownPlan, ShutdownPlanState } from '../../../shared/shutdown-plan';
import { element } from '../../dom';
import { actionButton, group, row, subheading } from './computer-controls';
import { clockTime, countdownText, nextOccurrence } from './shutdown-time';

// What the form holds between the page's redraws.
export interface ShutdownDraft {
  readonly whenIdle: boolean;
  readonly useTime: boolean;
  readonly time: string;
}

export interface ShutdownControls {
  readonly draft: ShutdownDraft;
  change(draft: ShutdownDraft): void;
  schedule(plan: ShutdownPlan): void;
  cancel(): void;
}

const BOTH_NOTE: string = 'With both on, it shuts down at whichever comes first. It always shuts down safely: the working chats are paused and get up to a minute to stop, and Cancel still stops it then (the chats are told to continue).';

// "Shut down later": at a time, once every chat finished working, or the first of the two.
export function renderShutdownGroup(state: ShutdownPlanState | null, controls: ShutdownControls): HTMLElement[] {
  const isActive: boolean = state !== null && (state.plan !== null || state.countdownEndsAt !== null);
  const rows: HTMLElement[] = state === null || !isActive ? formRows(controls) : plannedRows(state.plan, state, controls);
  return [subheading('Shut down later'), group(...rows), element('p', 'settings-note', BOTH_NOTE)];
}

// While it shuts down, the minute left is shown (sooner if the paused chats stop first), with Cancel.
function plannedRows(plan: ShutdownPlan | null, state: ShutdownPlanState, controls: ShutdownControls): HTMLElement[] {
  const summary: string = state.countdownEndsAt !== null
    ? `Shutting down safely: at most ${countdownText(state.countdownEndsAt - Date.now())} left while the chats stop`
    : planSummary(plan ?? { at: null, whenIdle: true });
  const working: string = state.workingChats === 1 ? '1 chat working now' : `${state.workingChats} chats working now`;
  const text: HTMLElement = element('span', 'computer-row-label shutdown-summary');
  text.append(element('span', '', summary), element('span', 'shutdown-working', working));
  return [row('computer-buttons', text, actionButton('Cancel', (): void => controls.cancel(), 'button is-armed'))];
}

function planSummary(plan: ShutdownPlan): string {
  const idle: string = 'when no chat is working';
  if (plan.at === null) return `Shuts down ${idle}`;
  return plan.whenIdle ? `Shuts down ${idle} or at ${clockTime(plan.at)}, whichever comes first` : `Shuts down at ${clockTime(plan.at)}`;
}

function formRows(controls: ShutdownControls): HTMLElement[] {
  const draft: ShutdownDraft = controls.draft;
  const idle: HTMLElement = checkRow('When no chat is working', draft.whenIdle, (checked: boolean): void => controls.change({ ...draft, whenIdle: checked }));
  const time: HTMLInputElement = element('input', 'shutdown-time');
  time.type = 'time';
  time.value = draft.time;
  time.disabled = !draft.useTime;
  time.addEventListener('change', (): void => controls.change({ ...draft, time: time.value }));
  const at: HTMLElement = checkRow('At', draft.useTime, (checked: boolean): void => controls.change({ ...draft, useTime: checked }));
  at.append(time);
  const plan: ShutdownPlan | null = planFrom(draft);
  const button: HTMLButtonElement = actionButton('Plan shutdown', (): void => {
    if (plan !== null) controls.schedule(plan);
  }, 'button button-primary');
  button.disabled = plan === null;
  return [idle, at, row('computer-buttons shutdown-actions', button)];
}

function planFrom(draft: ShutdownDraft): ShutdownPlan | null {
  const at: number | null = draft.useTime ? nextOccurrence(draft.time, new Date()) : null;
  if (draft.useTime && at === null) return null;
  return at === null && !draft.whenIdle ? null : { at, whenIdle: draft.whenIdle };
}

function checkRow(label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
  const box: HTMLInputElement = element('input', 'shutdown-check');
  box.type = 'checkbox';
  box.checked = checked;
  box.addEventListener('change', (): void => onChange(box.checked));
  const text: HTMLLabelElement = element('label', 'computer-row-label shutdown-option');
  text.append(box, label);
  return row('computer-buttons', text);
}
