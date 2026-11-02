// Orbit Web reached over plain http (a LAN address) has no Clipboard API; the old copy command still works there.
// Either way it must run inside the press itself: a phone refuses a copy that comes after an await.
export function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard !== undefined) return navigator.clipboard.writeText(text).then((): boolean => true, (): boolean => copyWithCommand(text));
  return Promise.resolve(copyWithCommand(text));
}

function copyWithCommand(text: string): boolean {
  const field: HTMLTextAreaElement = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } finally {
    field.remove();
  }
}
