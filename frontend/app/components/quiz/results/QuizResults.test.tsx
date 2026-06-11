import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import * as React from 'react';
import * as ReactDOMServer from 'react-dom/server';

import type { RankingEntry } from '@/app/types';

import QuizResults from './QuizResults';

const baseProps = {
  scorePercent: 50,
  scorePoints: 5,
  scoreTotal: 10,
  message: 'm',
};

test('preSortedRanking renders the given positions as-is (pinned rank preserved)', () => {
  const ranking: RankingEntry[] = [
    { position: 1, name: 'Winner', score: '90', medal: 'gold' },
    { position: 42, name: 'Me', score: '10', isYou: true },
  ];
  const html = ReactDOMServer.renderToString(
    <QuizResults {...baseProps} ranking={ranking} preSortedRanking />,
  );
  assert.match(html, /Me/);
  // The real pinned position (42) must survive, not be re-indexed to 2.
  assert.match(html, />42</);
});

test('without preSortedRanking, raw ranking is sorted by score and re-indexed', () => {
  const ranking: RankingEntry[] = [
    { position: 42, name: 'Low', score: '10' },
    { position: 42, name: 'High', score: '90' },
  ];
  const html = ReactDOMServer.renderToString(
    <QuizResults {...baseProps} ranking={ranking} />,
  );
  // Raw positions (42) are replaced by index-based ones.
  assert.doesNotMatch(html, />42</);
});

const noop = () => {};

const soloRanking: RankingEntry[] = [
  { position: 1, name: 'Winner', score: '90', medal: 'gold' },
];

test('renders the icon-only refresh button when onRefreshRanking is provided', () => {
  const html = ReactDOMServer.renderToString(
    <QuizResults
      {...baseProps}
      ranking={soloRanking}
      preSortedRanking
      onRefreshRanking={noop}
    />,
  );
  assert.match(html, /aria-label="Odśwież ranking"/);
  // Idle button must not spin — guards against dropping the refreshing ternary.
  assert.doesNotMatch(html, /animate-spin/);
});

test('omits the refresh button when onRefreshRanking is not provided', () => {
  const html = ReactDOMServer.renderToString(
    <QuizResults {...baseProps} ranking={soloRanking} preSortedRanking />,
  );
  assert.doesNotMatch(html, /Odśwież ranking/);
});

test('refresh button is disabled, busy and spinning while refreshing', () => {
  const html = ReactDOMServer.renderToString(
    <QuizResults
      {...baseProps}
      ranking={soloRanking}
      preSortedRanking
      onRefreshRanking={noop}
      refreshingRanking
    />,
  );
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /animate-spin/);
});

test('notice renders in flow after the action buttons and before promo cards', () => {
  const html = ReactDOMServer.renderToString(
    <QuizResults
      {...baseProps}
      onRetry={noop}
      onReview={noop}
      notice={<p>NOTICE_MARKER</p>}
    />,
  );
  const noticeAt = html.indexOf('NOTICE_MARKER');
  const reviewAt = html.indexOf('Przejrzyj odpowiedzi');
  const retryAt = html.indexOf('Spróbuj ponownie');
  const promoAt = html.indexOf('Wydział Informatyki AGH');
  assert.ok(noticeAt > -1, 'notice is rendered');
  // Below both buttons („Przejrzyj odpowiedzi" is the last one)…
  assert.ok(noticeAt > reviewAt && noticeAt > retryAt);
  // …and above the promotional materials, pushing them down (no overlay).
  assert.ok(promoAt > -1 && noticeAt < promoAt);
});

test('notice still renders below „Spróbuj ponownie" when answer review is hidden', () => {
  const html = ReactDOMServer.renderToString(
    <QuizResults
      {...baseProps}
      onRetry={noop}
      showAnswerReview={false}
      notice={<p>NOTICE_MARKER</p>}
    />,
  );
  const noticeAt = html.indexOf('NOTICE_MARKER');
  const retryAt = html.indexOf('Spróbuj ponownie');
  const promoAt = html.indexOf('Wydział Informatyki AGH');
  assert.doesNotMatch(html, /Przejrzyj odpowiedzi/);
  assert.ok(noticeAt > retryAt && noticeAt < promoAt);
});

test('renders no ranking section or refresh button without ranking data', () => {
  // Mirrors play replay mode: when no leaderboard is fetched, `ranking` stays
  // unset, so neither the ranking list nor its refresh button may appear.
  const html = ReactDOMServer.renderToString(
    <QuizResults
      {...baseProps}
      rankingTitle="Tablica wyników"
      onRefreshRanking={noop}
    />,
  );
  assert.doesNotMatch(html, /Tablica wyników/);
  assert.doesNotMatch(html, /Odśwież ranking/);
});
