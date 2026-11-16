export interface ToolResult {
  readonly content: readonly { readonly type: 'text'; readonly text: string }[];
  readonly isError: boolean;
}

export function answer(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: false };
}

export function problem(text: string): ToolResult {
  return { content: [{ type: 'text', text }], isError: true };
}

export type ToolArgs = Record<string, unknown>;
