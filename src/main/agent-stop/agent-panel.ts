// The panel under the prompt lists "main" first; its dot is hollow while the terminal shows one of the agents instead.
const MAIN_ROW: RegExp = /^[❯ ] ([●◯]) main$/;
const HOLLOW_DOT: string = '◯';

// Typing /tasks there would message that agent, so a stop must wait until the chat is back on main.
export function isShowingAgent(screen: string): boolean {
  const rows: string[] = screen.split('\n').map((line: string) => line.trimEnd()).filter((line: string) => MAIN_ROW.test(line));
  const last: string | undefined = rows.at(-1);
  return last !== undefined && MAIN_ROW.exec(last)?.[1] === HOLLOW_DOT;
}
