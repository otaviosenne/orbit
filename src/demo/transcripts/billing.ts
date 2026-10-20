import type { TranscriptItem } from '../../shared/types';
import { MINUTE_MS, SECOND_MS } from '../demo-clock';
import { TranscriptBuilder } from '../transcript-builder';

export function stripeWebhooksTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('webhooks')
    .user(40, 'Add a webhook endpoint for `invoice.paid` and `invoice.payment_failed`. Verify the signature.')
    .tools(39, [
      { name: 'Read', summary: 'src/routes/webhooks.ts', input: '{\n  "file_path": "src/routes/webhooks.ts"\n}', output: "router.post('/webhooks/stripe', raw(), handleStripeEvent);" },
      { name: 'Write', summary: 'src/billing/invoice-events.ts', input: '{\n  "file_path": "src/billing/invoice-events.ts"\n}', output: 'File created successfully.' },
      { name: 'Bash', summary: 'Run the billing tests', input: 'npm test -- billing', output: 'Tests: 1 failed, 22 passed, 23 total', isError: true },
    ])
    .assistant(
      36,
      'One test failed because the fixture still uses the old API version. I updated the fixture and the suite is green now.\n\n```ts\nconst event = stripe.webhooks.constructEvent(body, signature, secret);\n```',
    )
    .answeredQuestion(
      30,
      [
        {
          question: 'Where should failed payments be reported?',
          header: 'Alerts',
          multiSelect: false,
          options: [
            { label: 'Email the account owner', description: 'One email per failed invoice' },
            { label: 'Slack #billing', description: 'Post to the team channel' },
          ],
        },
      ],
      ['Slack #billing'],
    )
    .turn(28, 11 * MINUTE_MS + 5 * SECOND_MS)
    .user(3, 'Now retry failed deliveries.')
    .assistant(2, 'Before I write the retry worker I need one decision from you.')
    .build();
}

export function invoicePdfTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('invoice')
    .user(15, 'Export invoices as PDF with the company logo and line items.')
    .tools(14, [
      { name: 'Bash', summary: 'Install the PDF renderer', input: 'npm install @react-pdf/renderer', output: 'added 38 packages in 4s' },
      { name: 'Write', summary: 'src/billing/invoice-pdf.tsx', input: '{\n  "file_path": "src/billing/invoice-pdf.tsx"\n}', output: 'File created successfully.' },
      { name: 'Bash', summary: 'Render a sample invoice', input: 'npm run invoice:sample', output: 'Wrote out/INV-2041.pdf (2 pages, 48 KB)' },
    ])
    .assistant(
      6,
      '**Invoice PDFs are ready.** `GET /invoices/:id/pdf` now streams the file.\n\n- Logo and address come from the account settings\n- Line items paginate after 25 rows\n- Totals include tax per region',
    )
    .build();
}
