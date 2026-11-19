const MEGABYTE: number = 1024 * 1024;

// Plenty for a link, an address or a long message; a clipboard bigger than this is a file or an image dump, which an
// iPhone Shortcut would choke on anyway, and refusing it keeps a stray paste from filling either side's memory.
export const MAX_SHARED_TEXT_BYTES: number = 1 * MEGABYTE;

// A full-resolution iPhone photo or screenshot fits with room to spare; a larger body is not a copied picture.
export const MAX_SHARED_IMAGE_BYTES: number = 32 * MEGABYTE;

// A HEIC or JPEG photo grows several times over once decoded into PNG, so the converted copy gets its own ceiling.
export const MAX_CONVERTED_PNG_BYTES: number = 4 * MAX_SHARED_IMAGE_BYTES;
