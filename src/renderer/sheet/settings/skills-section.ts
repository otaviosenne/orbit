import type { SkillEntry } from '../../../shared/types';
import { element } from '../../dom';
import { SEARCH_ICON } from '../../icons';
import { filterSkills } from './skill-filter';

export type SkillPicked = (name: string) => void;

const PICK_KEY: string = 'Enter';
const LOADING_TEXT: string = 'Loading skills…';
const EMPTY_TEXT: string = 'No skills match';

// The chat's skills with a search field; picking one hands its name over, it never sends anything.
export class SkillsSection {
  readonly root: HTMLElement = element('section', 'chat-settings-section chat-settings-skills');
  private readonly search: HTMLInputElement = element('input', 'chat-settings-search-input');
  private readonly list: HTMLDivElement = element('div', 'chat-settings-skill-list');
  private skills: readonly SkillEntry[] = [];
  private loadingFor: string | null = null;

  constructor(private readonly onPick: SkillPicked) {
    this.search.type = 'search';
    this.search.placeholder = 'Search skills';
    this.search.spellcheck = false;
    this.search.addEventListener('input', (): void => this.render());
    this.search.addEventListener('keydown', (event: KeyboardEvent): void => {
      if (event.key !== PICK_KEY) return;
      event.preventDefault();
      const first: SkillEntry | undefined = this.visible()[0];
      if (first !== undefined) this.onPick(first.name);
    });
    const field: HTMLLabelElement = element('label', 'chat-settings-search');
    field.innerHTML = SEARCH_ICON;
    field.append(this.search);
    const head: HTMLDivElement = element('div', 'chat-settings-head');
    head.append(element('span', 'chat-settings-title', 'Skills'));
    this.root.append(head, field, this.list);
  }

  // Re-read on every open: a skill added in the meantime belongs in the list.
  async load(sessionId: string): Promise<void> {
    this.loadingFor = sessionId;
    this.search.value = '';
    this.list.replaceChildren(element('p', 'chat-settings-empty', LOADING_TEXT));
    const skills: SkillEntry[] = await window.radar.listSkills(sessionId);
    if (this.loadingFor !== sessionId) return;
    this.skills = skills;
    this.render();
  }

  focusSearch(): void {
    this.search.focus();
  }

  private visible(): SkillEntry[] {
    return filterSkills(this.skills, this.search.value);
  }

  private render(): void {
    const visible: SkillEntry[] = this.visible();
    if (visible.length === 0) return void this.list.replaceChildren(element('p', 'chat-settings-empty', EMPTY_TEXT));
    this.list.replaceChildren(...visible.map((skill: SkillEntry) => this.renderSkill(skill)));
  }

  private renderSkill(skill: SkillEntry): HTMLButtonElement {
    const row: HTMLButtonElement = element('button', 'chat-settings-skill');
    row.type = 'button';
    const name: HTMLSpanElement = element('span', 'chat-settings-skill-name', `/${skill.name}`);
    name.append(element('span', 'chat-settings-skill-source', skill.source));
    row.append(name, element('span', 'chat-settings-skill-description', skill.description));
    row.title = skill.description;
    row.addEventListener('click', (): void => this.onPick(skill.name));
    return row;
  }
}
