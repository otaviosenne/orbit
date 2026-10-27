import type { VoiceCommandContext } from './command-context';
import type { VoiceCommand } from './voice-command';

// The commands that move around the app. The draft-level ones (send, clear) are the runner's.
export function executeNavigation(command: VoiceCommand, context: VoiceCommandContext): void {
  switch (command.action) {
    case 'view':
      return context.setView(command.view);
    case 'choose':
      return choose(command.number, context);
    case 'device':
      return context.openDevice(command.device);
    case 'new-chat':
      return context.openNewChat();
    case 'resume':
      return context.openResume();
    case 'cancel':
      return context.close();
    case 'suspend':
      return context.suspendChat();
    case 'pin':
      return context.pinChat(true);
    case 'unpin':
      return context.pinChat(false);
    default:
      return;
  }
}

function choose(number: number, context: VoiceCommandContext): void {
  if (context.isSelectorOpen()) {
    if (!context.pick(number)) context.report(`No option #${number}`);
  } else if (!context.openChat(number)) context.report(`No chat #${number}`);
}
