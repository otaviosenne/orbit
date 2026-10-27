// Plain words without quotes: they travel through a shell command line (the resume prompt) and a terminal paste.

// Pausing is a request to the chat itself: only it can stop its own agents and background shells.
export const PAUSE_MESSAGE: string =
  'Pause: stop everything you are doing right now, including every running agent and background shell (use TaskStop for the ones still running). '
  + 'Do not start anything new, and ignore task notifications and messages from other chats until I tell you to continue. Reply with one short line.';

export const CONTINUE_MESSAGE: string = 'Continue: you can resume the work you paused. Restart anything you stopped if it is still needed.';

// Sent to a chat that was working when the machine went down, once it is reopened.
export const CUT_MESSAGE: string =
  'The computer was shut down while you were working, so your turn and every agent and background shell were cut off midway. '
  + 'Check where things stand (files, git status, anything that was running) and continue the work from there.';
