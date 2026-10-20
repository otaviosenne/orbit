import { BrowserWindow, dialog } from 'electron';
import type { OpenDialogReturnValue, WebContents } from 'electron';

// Attached to the window that asked, so the picker opens over it instead of as a loose window.
export async function chooseFolder(requester: WebContents): Promise<string | null> {
  const owner: BrowserWindow | null = BrowserWindow.fromWebContents(requester);
  const options: Electron.OpenDialogOptions = { title: 'Choose the folder Claude opens in', properties: ['openDirectory'] };
  const result: OpenDialogReturnValue = owner === null ? await dialog.showOpenDialog(options) : await dialog.showOpenDialog(owner, options);
  return result.canceled ? null : (result.filePaths[0] ?? null);
}
