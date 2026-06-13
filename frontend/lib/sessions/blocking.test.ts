import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canAdminBlockParticipant } from './blocking';

test('admin can block a participant who already submitted', () => {
  assert.equal(
    canAdminBlockParticipant({
      blocked: false,
      has_submitted: true,
    }),
    true,
  );
});

test('admin cannot block a participant who is already blocked', () => {
  assert.equal(
    canAdminBlockParticipant({
      blocked: true,
      has_submitted: true,
    }),
    false,
  );
});
