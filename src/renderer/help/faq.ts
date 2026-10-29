// A short question and its 1–3 line answer. {key:<shortcut id>} in an answer is replaced by that shortcut's
// keys from the registry, so answers never quote a key that changed.
export interface FaqEntry {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  // About something Orbit Web leaves out, so its Help does not list it.
  readonly desktopOnly?: boolean;
}

export const FAQ: readonly FaqEntry[] = [
  {
    id: 'columns',
    question: 'What do the board columns mean?',
    answer: 'Needs you: waiting on a prompt, or finished with a reply you have not opened. Working: busy right now. Active: seen, and it replied or you last read it less than 20 minutes ago (reopening a chat counts as reading it). Idle: seen and untouched for longer.',
  },
  {
    id: 'move-active-idle',
    question: 'Can I move a chat between Active and Idle?',
    answer: 'Yes: drag its card from one to the other. It stays there until the chat works again.',
  },
  {
    id: 'needs-you-while-reading',
    question: 'Why does a chat stay in Needs you while I read it?',
    answer: 'It leaves Needs you when you leave it (another chat, closing the panel, or leaving its terminal), so it never moves away mid-read. Opening it already clears the green dot.',
  },
  {
    id: 'new-chat',
    question: 'How do I start a new chat?',
    answer: 'New chat ({key:new-chat}) opens one in the last project. The caret, a right-click or {key:new-chat-menu} lists every project; Add Shortcut… at its end saves a new one.',
  },
  {
    id: 'close-chat',
    question: 'How do I close a chat?',
    answer: 'Right-click its card and pick Close, or open it and use Chat settings → Close chat ({key:chat-close} asks the same way). Its terminal window closes too.',
  },
  {
    id: 'suspend-chat',
    question: 'What does suspending a chat do?',
    answer: 'It closes the chat but keeps it, faded, in Suspended at the bottom of the board (click its header to fold it). Use Suspend in Chat settings, on a card’s right-click menu, by dragging the card there, or {key:chat-suspend}. Send it a message, or press Reopen chat, and it comes back.',
    desktopOnly: true,
  },
  {
    id: 'pin-chat',
    question: 'How do I pin a chat?',
    answer: 'Drag its card onto Pinned, right-click it and pick Pin, or press {key:chat-pin} with the chat open. Pinned chats also sit in a row above the columns; {key:open-pinned} opens them in order, and dragging one out unpins it.',
  },
  {
    id: 'reopen-chat',
    question: 'How do I reopen a closed chat?',
    answer: 'Resume ({key:resume}) lists closed chats from every project; pick one to reopen it where it left off. A closed pinned chat stays faded in the Pinned row: open it and press Reopen chat, or just send it a message.',
  },
  {
    id: 'answer-questions',
    question: "How do I answer Claude's questions?",
    answer: 'When Claude asks you something, it waits in Needs you and the question shows at the end of its thread. Answer there, or go to its terminal ({key:chat-terminal}) and answer in the chat itself.',
  },
  {
    id: 'interrupt',
    question: 'How do I interrupt Claude?',
    answer: 'While a chat works, press the stop button at the end of its "Working…" line, or {key:chat-interrupt}, then confirm. It is the same as Escape in its terminal.',
  },
  {
    id: 'stop-agent',
    question: 'How do I stop an agent?',
    answer: 'Hover the agent strip under the chat header, click the X beside the agent and confirm Stop agent. Click an agent instead to read its own transcript.',
  },
  {
    id: 'stop-shell',
    question: 'How do I stop a background shell?',
    answer: 'Shells sit on the right of the agent strip. Click a row to see its command and output; its X interrupts a running shell, or hides a finished one.',
  },
  {
    id: 'dictate',
    question: 'How do I dictate?',
    answer: 'Hold Space in the composer, or anywhere in an open chat outside a text field, and talk; let go to stop. A quick tap still types a space. In Orbit Web (phone or browser), tap the mic in the composer instead: it stays on until you tap it again. A red “No speech detected” means nothing was heard: check that your microphone is on.',
  },
  {
    id: 'hands-free',
    question: 'What is hands-free?',
    answer: 'Double-tap Space, or click the mic in a composer, to keep the mic on: words go to the chat on screen and follow you between chats. Double-tap again, or click either mic, to turn it off. In Orbit Web only the mic does it, and it turns off when the screen locks or you switch apps.',
  },
  {
    id: 'chat-settings',
    question: 'How do I change the model, effort or permissions?',
    answer: 'Open the chat and click the sliders ({key:chat-settings}). A new model or effort also becomes the default for chats started later.',
  },
  {
    id: 'skills',
    question: 'How do I run a skill?',
    answer: 'Chat settings → Skills: search and click one. It is put at the start of the composer for you to finish; nothing is sent until you send.',
  },
  {
    id: 'rename-recolor',
    question: 'How do I rename or recolor a chat?',
    answer: 'The pencil beside the name renames ({key:chat-rename}); the color dot before it picks a color. On the board, right-click a card → Rename.',
  },
  {
    id: 'own-window',
    question: 'How do I open a chat in its own window?',
    answer: 'New window in the chat header ({key:chat-window}), or right-click a card → Open in new window. Go to chat ({key:chat-terminal}) jumps to its terminal instead.',
  },
  {
    id: 'images',
    question: 'How do I send images or other files?',
    answer: 'Paste, drop or pick them with the paperclip in the composer. Each shows as a chip ([Image #N], [Video #N], [PDF #N], [File #N]…); click one to see it. Claude gets other files as their saved path; in the thread, videos and audio play and PDFs open, anything else shows its path.',
  },
  {
    id: 'jump-messages',
    question: 'How do I find my earlier messages?',
    answer: 'The chevrons at the thread edge ({key:chat-previous-message} and {key:chat-next-message}) step through your own messages, loading older history as needed. Hover one to preview where it goes.',
  },
  {
    id: 'text-size',
    question: 'How do I make the text bigger?',
    answer: 'Ctrl + scroll over the chat panel or a Panel tile. Drag the panel’s left edge to widen it; double-click the edge to reset.',
  },
  {
    id: 'panel-view',
    question: 'What is the Panel view?',
    answer: 'Several chats live side by side ({key:view-panel}): pick them in the sidebar, set columns, rows and text size at its foot, and drag a tile header to reorder.',
    desktopOnly: true,
  },
  {
    id: 'list-view',
    question: 'How do I sort or reorder the List?',
    answer: 'The List ({key:view-list}) has one row per open chat; pick A–Z or Manual at its top. In Manual, press and hold a row, then drag it up or down, or focus it and press Alt+↑ or Alt+↓.',
  },
  {
    id: 'timeline-marks',
    question: 'What do the timeline marks mean?',
    answer: 'One lane per chat. Solid bar: an agent working; striped: an agent gone quiet; faded: finished. The thin line is the chat itself working or waiting on you. Hover any mark for details.',
  },
  {
    id: 'timeline-modes',
    question: 'What are Bars, Lines, Open and All?',
    answer: 'Bars draws each agent; Lines plots how many agents each chat runs ({key:timeline-mode}). All adds chats closed now that were active in the range ({key:timeline-scope}).',
  },
  {
    id: 'drafts',
    question: 'Will I lose what I was typing?',
    answer: 'No. Each chat keeps its unsent text and images while you switch, and the text survives quitting Orbit.',
  },
  {
    id: 'orbit-web',
    question: 'What is Orbit Web?',
    answer: 'Board, Timeline, List and chats on a phone or another browser, behind a token, with dictation through the composer’s mic. Turn it on in Settings → Orbit Web; windows and closing chats stay on the desktop.',
  },
  {
    id: 'appearance-usage',
    question: 'Where are Orbit’s own settings?',
    answer: 'The gear ({key:view-settings}): Light, Dark or Auto appearance, your usage limits with their reset times, and Orbit Web.',
  },
  {
    id: 'keyboard-board',
    question: 'Can I use the board without a mouse?',
    answer: 'Yes: the arrow keys (or H, J, K and L) move a focus ring across the cards and {key:board-open} opens the focused chat; with a chat open, the arrows scroll it instead. {key:help} lists every shortcut.',
  },
];

export function availableQuestions(isWeb: boolean, entries: readonly FaqEntry[] = FAQ): readonly FaqEntry[] {
  return entries.filter((entry: FaqEntry) => !isWeb || entry.desktopOnly !== true);
}
