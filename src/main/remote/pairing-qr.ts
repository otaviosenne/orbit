import qrcode from 'qrcode-generator';

// 0 lets the encoder pick the smallest QR version that fits the URL.
const AUTO_VERSION: 0 = 0;
// Medium correction survives a phone camera's glare without making the code much denser.
const CORRECTION: 'M' = 'M';
// The blank margin scanners need around the code, in modules.
const QUIET_ZONE: number = 4;

// Drawn here, from the URL alone: the token never goes to a QR service. One path keeps the SVG small; the colors come
// from CSS (currentColor on a light tile) so it reads in both themes.
export function pairingQrSvg(text: string): string {
  const code: ReturnType<typeof qrcode> = qrcode(AUTO_VERSION, CORRECTION);
  code.addData(text);
  code.make();
  const count: number = code.getModuleCount();
  const size: number = count + 2 * QUIET_ZONE;
  const cells: string[] = [];
  for (let row: number = 0; row < count; row += 1) {
    for (let column: number = 0; column < count; column += 1) {
      if (code.isDark(row, column)) cells.push(`M${column + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges" role="img" aria-label="Pairing QR code"><path fill="currentColor" d="${cells.join('')}"/></svg>`;
}
