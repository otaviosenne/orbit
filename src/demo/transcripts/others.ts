import type { TranscriptItem } from '../../shared/types';
import { MINUTE_MS, SECOND_MS } from '../demo-clock';
import { TranscriptBuilder } from '../transcript-builder';

export function flakyTestTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('flaky')
    .user(20, 'The cart e2e test fails about one run in ten. Find out why.')
    .tools(18, [
      { name: 'Bash', summary: 'Run the cart test 20 times', input: 'npx playwright test cart --repeat-each=20', output: '2 failed, 18 passed' },
      { name: 'Read', summary: 'tests/e2e/cart.spec.ts', input: '{\n  "file_path": "tests/e2e/cart.spec.ts"\n}', output: "await page.click('text=Add to cart');\nawait expect(badge).toHaveText('1');" },
    ])
    .assistant(
      5,
      'Found it: the test clicks **Add to cart** before the product price has loaded, so the button is still disabled.\n\nI now wait for the price to render first. 50 runs in a row pass.',
    )
    .turn(4, 16 * MINUTE_MS + 12 * SECOND_MS)
    .build();
}

export function pushNotificationsTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('push')
    .user(70, 'Set up push notifications for order updates on iOS and Android.')
    .assistant(48, 'Push notifications are wired up through Expo. Order status changes now send a notification with a deep link to the order.')
    .turn(47, 21 * MINUTE_MS)
    .build();
}

export function terraformTranscript(): TranscriptItem[] {
  return new TranscriptBuilder('terraform')
    .user(150, 'Upgrade the AWS provider to v6 and fix whatever breaks.')
    .tools(140, [{ name: 'Bash', summary: 'Plan the upgrade', input: 'terraform plan', output: 'Plan: 0 to add, 3 to change, 0 to destroy.' }])
    .assistant(129, 'The provider is on v6. Only tags changed on three buckets, nothing gets replaced.')
    .build();
}
