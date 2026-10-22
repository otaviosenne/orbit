import paperclip from '@phosphor-icons/core/assets/regular/paperclip.svg';
import fileVideo from '@phosphor-icons/core/assets/regular/file-video.svg';
import fileAudio from '@phosphor-icons/core/assets/regular/file-audio.svg';
import filePdf from '@phosphor-icons/core/assets/regular/file-pdf.svg';
import fileImage from '@phosphor-icons/core/assets/regular/file-image.svg';
import file from '@phosphor-icons/core/assets/regular/file.svg';
import folderOpen from '@phosphor-icons/core/assets/regular/folder-open.svg';
import type { AttachmentKind } from '../../shared/attachment-kinds';

// Kept apart from icons.ts: these belong to attachments alone.
export const ATTACH_ICON: string = paperclip;
export const FOLDER_ICON: string = folderOpen;

export const FILE_KIND_ICONS: Readonly<Record<AttachmentKind, string>> = {
  image: fileImage,
  video: fileVideo,
  audio: fileAudio,
  pdf: filePdf,
  file,
};
