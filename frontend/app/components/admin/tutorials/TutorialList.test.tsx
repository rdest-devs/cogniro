import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { TutorialList } from './TutorialList';
import { tutorialGroups } from './tutorialsData';

test('tutorial data is non-empty with unique ids and titled steps', () => {
  assert.ok(tutorialGroups.length > 0);
  const groupIds = new Set<string>();
  const tutorialIds = new Set<string>();
  for (const group of tutorialGroups) {
    assert.ok(group.title.length > 0);
    assert.ok(group.tutorials.length > 0);
    assert.equal(groupIds.has(group.id), false);
    groupIds.add(group.id);
    for (const tutorial of group.tutorials) {
      assert.ok(tutorial.title.length > 0);
      assert.ok(tutorial.steps.length > 0);
      assert.equal(tutorialIds.has(tutorial.id), false);
      tutorialIds.add(tutorial.id);
    }
  }
});

test('renders grouped tutorials with titles and steps', () => {
  const html = ReactDOMServer.renderToString(
    <TutorialList groups={tutorialGroups} />,
  );
  for (const group of tutorialGroups) {
    assert.ok(
      html.includes(group.title),
      `missing group title: ${group.title}`,
    );
    for (const tutorial of group.tutorials) {
      assert.ok(
        html.includes(tutorial.title),
        `missing tutorial title: ${tutorial.title}`,
      );
    }
  }
});
