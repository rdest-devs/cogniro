import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import { TutorialList } from './TutorialList';
import { tutorialVideos } from './tutorialsData';

test('tutorial data is non-empty with unique ids, titles and video ids', () => {
  assert.ok(tutorialVideos.length > 0);
  const ids = new Set<string>();
  const videoIds = new Set<string>();
  for (const video of tutorialVideos) {
    assert.ok(video.title.trim().length > 0, `empty title: ${video.id}`);
    assert.match(
      video.videoId,
      /^[\w-]{11}$/,
      `invalid YouTube id: ${video.videoId}`,
    );
    assert.equal(ids.has(video.id), false, `duplicate id: ${video.id}`);
    ids.add(video.id);
    assert.equal(
      videoIds.has(video.videoId),
      false,
      `duplicate video id: ${video.videoId}`,
    );
    videoIds.add(video.videoId);
  }
});

test('renders a titled YouTube embed for each tutorial', () => {
  const html = ReactDOMServer.renderToString(
    <TutorialList videos={tutorialVideos} />,
  );
  for (const video of tutorialVideos) {
    assert.ok(html.includes(video.title), `missing title: ${video.title}`);
    assert.ok(
      html.includes(video.videoId),
      `missing embed for video: ${video.videoId}`,
    );
  }
});
