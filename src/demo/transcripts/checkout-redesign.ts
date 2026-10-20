import type { TranscriptItem } from '../../shared/types';
import { MINUTE_MS, SECOND_MS } from '../demo-clock';
import { TranscriptBuilder } from '../transcript-builder';

export function checkoutRedesignTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('checkout')
    .user(34, 'The checkout page feels cramped on mobile. Can you move the order summary into a collapsible card and keep the pay button sticky?')
    .assistant(33, "I'll start by looking at how the checkout page is put together.")
    .tools(33, [
      { name: 'Glob', summary: 'src/features/checkout/**/*.tsx', input: '{\n  "pattern": "src/features/checkout/**/*.tsx"\n}', output: 'src/features/checkout/CheckoutPage.tsx\nsrc/features/checkout/OrderSummary.tsx\nsrc/features/checkout/PayButton.tsx\nsrc/features/checkout/AddressForm.tsx' },
      { name: 'Read', summary: 'src/features/checkout/CheckoutPage.tsx', input: '{\n  "file_path": "src/features/checkout/CheckoutPage.tsx"\n}', output: 'export function CheckoutPage(): JSX.Element {\n  return (\n    <main className="checkout">\n      <AddressForm />\n      <OrderSummary />\n      <PayButton />\n    </main>\n  );\n}' },
      { name: 'Grep', summary: 'useOrderTotals', input: '{\n  "pattern": "useOrderTotals"\n}', output: 'src/features/checkout/OrderSummary.tsx:4\nsrc/features/cart/CartDrawer.tsx:12' },
    ])
    .assistant(
      31,
      [
        'Here is the plan:',
        '',
        '1. **Collapsible summary**: wrap `OrderSummary` in a `<details>` card that starts closed below `md`.',
        '2. **Sticky pay button**: pin `PayButton` to the bottom with `position: sticky` and a safe-area inset.',
        '3. **Totals stay visible**: show the order total in the collapsed header so nobody has to open it to see the price.',
        '',
        'I launched an agent to audit the payment form for accessibility while I work on the layout.',
      ].join('\n'),
    )
    .notice(22, 'Agent finished: Audit payment form a11y', '2 issues found: the card number field has no label, and the error text is not announced.')
    .tools(20, [
      { name: 'Edit', summary: 'src/features/checkout/OrderSummary.tsx', input: '{\n  "file_path": "src/features/checkout/OrderSummary.tsx",\n  "old_string": "<section className=\\"summary\\">",\n  "new_string": "<details className=\\"summary-card\\" open={isWide}>"\n}', output: 'The file has been updated.' },
      { name: 'Edit', summary: 'src/features/checkout/checkout.css', input: '{\n  "file_path": "src/features/checkout/checkout.css",\n  "old_string": ".pay-button {",\n  "new_string": ".pay-button {\\n  position: sticky;\\n  bottom: env(safe-area-inset-bottom);"\n}', output: 'The file has been updated.' },
      { name: 'Bash', summary: 'Run the checkout unit tests', input: 'npm test -- checkout', output: ' PASS  src/features/checkout/OrderSummary.test.tsx\n PASS  src/features/checkout/PayButton.test.tsx\n\nTests: 14 passed, 14 total' },
    ])
    .assistant(
      18,
      [
        'Done. The summary collapses on phones and the pay button stays in reach.',
        '',
        '| Viewport | Summary | Pay button |',
        '| --- | --- | --- |',
        '| < 768px | Collapsed, total in header | Sticky |',
        '| ≥ 768px | Open in the side column | Inline |',
        '',
        'The a11y agent also flagged two issues in the payment form. Want me to fix those too?',
      ].join('\n'),
    )
    .turn(18, 14 * MINUTE_MS + 32 * SECOND_MS)
    .user(5, 'Yes, fix both. And add end-to-end tests for the mobile flow.')
    .assistant(4, 'On it. I am mapping every component the flow touches and writing the tests in parallel.')
    .tools(3, [
      { name: 'Agent', summary: 'Map checkout components', input: '{\n  "description": "Map checkout components",\n  "subagent_type": "Explore"\n}', output: null },
      { name: 'Agent', summary: 'Write Playwright checkout tests', input: '{\n  "description": "Write Playwright checkout tests",\n  "subagent_type": "general-purpose"\n}', output: null },
      { name: 'Edit', summary: 'src/features/checkout/CardNumberField.tsx', input: '{\n  "file_path": "src/features/checkout/CardNumberField.tsx",\n  "old_string": "<input",\n  "new_string": "<label htmlFor=\\"card-number\\">Card number</label>\\n<input id=\\"card-number\\""\n}', output: 'The file has been updated.' },
    ])
    .build();
}
