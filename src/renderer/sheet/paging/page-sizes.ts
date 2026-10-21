// Counted in transcript items, as main pages them. Tool calls take an item each but fold into one row, so a page
// holds more items than the messages it shows.

// Roughly one screen of a Panel tile, so opening the Panel stays quick; a page too short to fill its tile loads
// more on its own, and scrolling up loads the rest.
export const TILE_PAGE_ITEMS: number = 6;
// About a screen of the side drawer and a chat's own window, for the same reason.
export const DRAWER_PAGE_ITEMS: number = 20;
