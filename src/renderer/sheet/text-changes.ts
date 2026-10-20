export type TextChanged = () => void;

// The draft is also written by code (dictation, marker renumbering, restored drafts, a tapped Space) and
// those writes fire no input event; announcing one would make dictation think the user took over. So the
// field's own writers are wrapped instead, and every change, typed or written, is reported.
export function watchTextChanges(input: HTMLTextAreaElement, onChange: TextChanged): void {
  input.addEventListener('input', onChange);
  wrapValueSetter(input, onChange);
  wrapSetRangeText(input, onChange);
}

function wrapValueSetter(input: HTMLTextAreaElement, onChange: TextChanged): void {
  const native: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  const get: (() => string) | undefined = native?.get;
  const set: ((value: string) => void) | undefined = native?.set;
  if (get === undefined || set === undefined) return;
  Object.defineProperty(input, 'value', {
    configurable: true,
    get(this: HTMLTextAreaElement): string {
      return get.call(this);
    },
    set(this: HTMLTextAreaElement, value: string): void {
      set.call(this, value);
      onChange();
    },
  });
}

function wrapSetRangeText(input: HTMLTextAreaElement, onChange: TextChanged): void {
  const native: HTMLTextAreaElement['setRangeText'] = input.setRangeText;
  input.setRangeText = function (this: HTMLTextAreaElement, ...args: Parameters<HTMLTextAreaElement['setRangeText']>): void {
    Reflect.apply(native, this, args);
    onChange();
  } as HTMLTextAreaElement['setRangeText'];
}
