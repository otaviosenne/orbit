const STORAGE_KEY: string = 'orbit.grid-sidebar-collapsed';

// Whether the Panel's chat list is folded to a thin rail, kept across launches.
export class SidebarCollapse {
  private collapsed: boolean = load();

  get isCollapsed(): boolean {
    return this.collapsed;
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    save(this.collapsed);
  }
}

// Storage can be unavailable; then the choice simply lasts for this run.
function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function save(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(collapsed));
  } catch {
    // Not persisted.
  }
}
