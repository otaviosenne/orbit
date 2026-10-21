# Feature guide

A closer look at what each part of Orbit does. The [README](../README.md) has the overview and
screenshots.

## Board

| Column | A chat lands here when |
| --- | --- |
| **Needs you** | It waits on a permission prompt or a question, or it finished and you have not opened it since. A green dot marks a reply you have not read. |
| **Working** | Claude is in the middle of a turn. |
| **Active** | You have seen it and it finished less than 10 minutes ago. |
| **Idle** | You have seen it and it finished more than 10 minutes ago. |

A chat counts as seen once you **leave** it: open another chat, close the panel, or move focus away
from its terminal window. It stays in Needs you while you are still reading it.

Each card shows:

- the chat name, with its `/color` as a tag dot;
- beside the name, an Android icon and a globe icon while the chat's emulator window or Chrome tab is
  open; clicking one goes straight to that window, without opening the card;
- the repository (the git root of the folder the chat started in);
- how long it has been in its current status, with Claude Code's spinner while it works;
- its running agents with elapsed time. An agent that has not written anything for 3 minutes shows
  *quiet* in amber;
- how many agents already finished.

Hover a card to pin it: pinned chats also appear in a **Pinned** row above the columns.
Right-click a card to open it in its own window, pin it, rename it or close its terminal. Closing is
optimistic: the card disappears at once and comes back if the close fails.

## Chat panel

Click a card (or a timeline lane) to open the chat on the right. Click the same card again to close it.

- **Thread**: messages render as markdown. Back-to-back tool calls fold into one row you can open to
  see each input and output. Agent completions, slash commands and compactions show as notices,
  messages to and from other chats show as peer rows, and "Worked for" dividers end each turn.
- **Composer**: sends a prompt into the chat. The bubble shows as *Sending…* until delivery
  succeeds. Paste, drop or pick images: they are attached as `[Image #N]` chips. Unsent text is kept
  per chat.
- **Navigation**: chevrons step through your own messages. Hover one for half a second to preview
  where it goes.
- **Header**: rename (pencil), change the `/color` (dot), and **Go to chat** focuses its terminal.
- **Working line**: while Claude works, the panel shows the spinner verb, elapsed time and output
  tokens, like the CLI.
- **Resize**: drag the left edge (up to half the window). Double-click resets it.

### Agents

Running agents appear under the header (three at most, the rest behind a toggle), each with a stable
color. Click one to read its transcript read-only. <kbd>Esc</kbd> or the back chevron returns to the chat.

### Questions

When Claude asks a multiple-choice question, the end of the thread shows it as a form, one question
at a time, then a review step with **Submit answers**. Orbit reads the picker from the terminal
screen, so a layout it cannot read (for example options with previews) shows a note to answer in
the terminal instead. Answered questions stay in the thread as a one-line summary.

### Dictation

Hold <kbd>Space</kbd> in the composer to talk (a quick tap still types a space). With a chat open,
<kbd>Space</kbd> anywhere outside a text field works too: hold it to talk, or tap it to start and tap
again to stop. The text appears word by word. The microphone button in the field does the same.

## Panel

The Panel view tiles live chats in a grid. Click chats in the sidebar to add or remove them, drag a
tile's header to reorder, and use the sidebar foot to choose 1 to 3 columns and rows and the text
size. Each tile has its own composer. The layout is remembered.

## Timeline

One lane per chat over the last 1, 2, 3 or 6 hours:

- a thin line shows how long the chat has been working or waiting;
- one bar per agent, striped amber while the agent is quiet;
- **Open / All**: *All* adds a muted **Closed** section with chats that are closed now but worked
  inside the window, with their turns and agents.

## New chat and Resume

- **New chat** reopens the last project with a left click. The caret lists every project from your
  launcher script, plus **Add Shortcut…** to save a label, chat name and folder. The new chat gets a
  random `/color` and opens in the panel as soon as it appears.
- **Resume** lists closed chats from the last 90 days, newest first, grouped by day. Search by title
  or repository, filter by date and repository, or sort by name or size. Picking one reopens it with
  `claude --resume` in a new terminal, in the folder it started in.

## Settings

- **Appearance**: Light, Dark or Auto (follows the system).
- **Usage**: your plan's session and weekly limits with reset times, and how this week's usage split
  across models. Refreshed about once a minute.
