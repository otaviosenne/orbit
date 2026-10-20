import type { TranscriptItem } from '../../shared/types';
import { TranscriptBuilder } from '../transcript-builder';

export function apiReferenceTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('api-reference')
    .user(10, 'Regenerate the API reference from the OpenAPI spec and add a runnable example to every endpoint.')
    .assistant(9, 'I split the work: one agent writes the examples, another checks every link in the generated pages.')
    .tools(9, [
      { name: 'Bash', summary: 'Generate pages from openapi.yaml', input: 'npm run docs:generate', output: 'Generated 64 pages in docs/api/' },
      { name: 'Agent', summary: 'Generate endpoint examples', input: '{\n  "description": "Generate endpoint examples"\n}', output: null },
      { name: 'Agent', summary: 'Check broken links', input: '{\n  "description": "Check broken links"\n}', output: 'All 412 links resolve.' },
    ])
    .peer(7, 'in', 'Stripe webhooks', 'Heads up: `invoice.payment_failed` now has a `retry_at` field, please document it.')
    .assistant(6, 'Noted. I will add `retry_at` to the webhook event reference once the examples are in.')
    .build();
}

export function changelogTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('changelog')
    .user(2, 'Draft the 2.4 changelog from the merged pull requests since v2.3.0.')
    .tools(1, [
      { name: 'Bash', summary: 'List merged PRs since v2.3.0', input: 'git log v2.3.0..HEAD --merges --oneline', output: '27 merges' },
      { name: 'Write', summary: 'docs/changelog/2.4.md', input: '{\n  "file_path": "docs/changelog/2.4.md"\n}', output: null },
    ])
    .build();
}
