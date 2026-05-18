import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  normalizeKqfQuestionImageToDirectoryPath,
  resolveEditorQuestionPlayImageUrls,
  resolveKqfPlayImageUrls,
} from './media-url';

describe('resolveKqfPlayImageUrls', () => {
  it('appends image.webp and thumb.webp for asset directory URLs', () => {
    assert.deepEqual(
      resolveKqfPlayImageUrls(
        'http://localhost:8000/media/quiz_1/asset_cc0b501288944523b06ae7d26cf078ab',
      ),
      {
        fullUrl:
          'http://localhost:8000/media/quiz_1/asset_cc0b501288944523b06ae7d26cf078ab/image.webp',
        thumbUrl:
          'http://localhost:8000/media/quiz_1/asset_cc0b501288944523b06ae7d26cf078ab/thumb.webp',
      },
    );
  });

  it('uses same URL for full and thumb when path is already a file', () => {
    assert.deepEqual(
      resolveKqfPlayImageUrls('http://localhost:8000/media/quiz_1/dog.jpg'),
      {
        fullUrl: 'http://localhost:8000/media/quiz_1/dog.jpg',
        thumbUrl: 'http://localhost:8000/media/quiz_1/dog.jpg',
      },
    );
  });
});

describe('normalizeKqfQuestionImageToDirectoryPath', () => {
  it('strips staging /image.webp to ./media/{asset}', () => {
    assert.equal(
      normalizeKqfQuestionImageToDirectoryPath(
        '/media/quiz-assets/asset_cc0b501288944523b06ae7d26cf078ab/image.webp',
      ),
      './media/asset_cc0b501288944523b06ae7d26cf078ab',
    );
  });

  it('strips ./media/.../thumb.webp', () => {
    assert.equal(
      normalizeKqfQuestionImageToDirectoryPath(
        './media/asset_cc0b501288944523b06ae7d26cf078ab/thumb.webp',
      ),
      './media/asset_cc0b501288944523b06ae7d26cf078ab',
    );
  });

  it('leaves non-asset paths unchanged', () => {
    assert.equal(
      normalizeKqfQuestionImageToDirectoryPath('./media/dog.jpg'),
      './media/dog.jpg',
    );
    assert.equal(
      normalizeKqfQuestionImageToDirectoryPath('https://cdn.example.com/x.png'),
      'https://cdn.example.com/x.png',
    );
  });

  it('returns null for empty', () => {
    assert.equal(normalizeKqfQuestionImageToDirectoryPath(null), null);
    assert.equal(normalizeKqfQuestionImageToDirectoryPath(''), null);
  });
});

describe('resolveEditorQuestionPlayImageUrls', () => {
  it('uses admin staging endpoint for ./media/… when quiz id is missing', () => {
    assert.deepEqual(
      resolveEditorQuestionPlayImageUrls('./media/asset_abc', null),
      {
        fullUrl: 'http://localhost:8000/admin/assets/asset_abc/image.webp',
        thumbUrl: 'http://localhost:8000/admin/assets/asset_abc/thumb.webp',
      },
    );
  });

  it('pairs absolute URLs like resolveKqfPlayImageUrls', () => {
    assert.deepEqual(
      resolveEditorQuestionPlayImageUrls(
        'http://localhost:8000/media/quiz_1/asset_x',
        'quiz_ignored',
      ),
      resolveKqfPlayImageUrls('http://localhost:8000/media/quiz_1/asset_x'),
    );
  });
});
