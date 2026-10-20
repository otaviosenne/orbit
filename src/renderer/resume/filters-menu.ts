import { element } from '../dom';
import { CHECK_ICON } from '../icons';
import type { DateRange, ResumeFilters, SortOrder } from './resume-filters';
import { DATE_RANGES, DEFAULT_FILTERS, SORT_ORDERS } from './resume-filters';

export type FiltersChanged = (filters: ResumeFilters) => void;

const DATE_LABELS: Readonly<Record<DateRange, string>> = { any: 'Any', today: 'Today', week: '7 days', month: '30 days' };
const SORT_LABELS: Readonly<Record<SortOrder, string>> = { recent: 'Recent', name: 'Name', size: 'Size' };

// The small menu behind the "Filters" control; it stays open while choices are made, like a macOS popover.
export class FiltersMenu {
  readonly root: HTMLDivElement = element('div', 'resume-filters-menu');
  private filters: ResumeFilters = DEFAULT_FILTERS;
  private repositories: readonly string[] = [];

  constructor(private readonly onChange: FiltersChanged) {
    this.root.hidden = true;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(filters: ResumeFilters, repositories: readonly string[]): void {
    this.filters = filters;
    this.repositories = repositories;
    this.root.hidden = false;
    this.render();
  }

  close(): void {
    this.root.hidden = true;
  }

  private change(next: ResumeFilters): void {
    this.filters = next;
    this.render();
    this.onChange(next);
  }

  private render(): void {
    this.root.replaceChildren(
      section('Date', this.segmented(DATE_RANGES, DATE_LABELS, this.filters.date, (date: DateRange) => this.change({ ...this.filters, date }))),
      section('Repository', this.repositoryList()),
      section('Sort', this.segmented(SORT_ORDERS, SORT_LABELS, this.filters.sort, (sort: SortOrder) => this.change({ ...this.filters, sort }))),
      this.resetButton(),
    );
  }

  private segmented<T extends string>(values: readonly T[], labels: Readonly<Record<T, string>>, current: T, pick: (value: T) => void): HTMLDivElement {
    const control: HTMLDivElement = element('div', 'resume-segmented');
    control.append(
      ...values.map((value: T): HTMLButtonElement => {
        const option: HTMLButtonElement = button(`resume-segment${value === current ? ' is-active' : ''}`, labels[value]);
        option.addEventListener('click', (): void => pick(value));
        return option;
      }),
    );
    return control;
  }

  private repositoryList(): HTMLDivElement {
    const list: HTMLDivElement = element('div', 'resume-repo-list');
    const selected: ReadonlySet<string> = new Set(this.filters.repositories);
    list.append(this.repositoryItem('All repositories', selected.size === 0, (): void => this.change({ ...this.filters, repositories: [] })));
    for (const name of this.repositories) {
      list.append(this.repositoryItem(name, selected.has(name), (): void => this.change({ ...this.filters, repositories: toggled(this.filters.repositories, name) })));
    }
    return list;
  }

  private repositoryItem(label: string, isChecked: boolean, pick: () => void): HTMLButtonElement {
    const item: HTMLButtonElement = button(`resume-repo-item${isChecked ? ' is-checked' : ''}`);
    const mark: HTMLSpanElement = element('span', 'resume-repo-check');
    if (isChecked) mark.innerHTML = CHECK_ICON;
    item.append(mark, element('span', 'resume-repo-name', label));
    item.addEventListener('click', pick);
    return item;
  }

  private resetButton(): HTMLButtonElement {
    const reset: HTMLButtonElement = button('resume-filters-reset', 'Reset');
    reset.disabled = JSON.stringify(this.filters) === JSON.stringify(DEFAULT_FILTERS);
    reset.addEventListener('click', (): void => this.change(DEFAULT_FILTERS));
    return reset;
  }
}

function section(title: string, body: HTMLElement): HTMLDivElement {
  const group: HTMLDivElement = element('div', 'resume-filters-section');
  group.append(element('div', 'resume-filters-title', title), body);
  return group;
}

function button(className: string, text?: string): HTMLButtonElement {
  const node: HTMLButtonElement = element('button', className, text);
  node.type = 'button';
  return node;
}

function toggled(names: readonly string[], name: string): string[] {
  return names.includes(name) ? names.filter((candidate: string) => candidate !== name) : [...names, name];
}
