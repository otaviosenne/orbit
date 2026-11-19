const MEGABYTE: number = 1024 * 1024;

// Plenty for a link, an address or a long message; a clipboard bigger than this is a file or an image dump, which an
// iPhone Shortcut would choke on anyway, and refusing it keeps a stray paste from filling either side's memory.
export const MAX_SHARED_TEXT_BYTES: number = 1 * MEGABYTE;
