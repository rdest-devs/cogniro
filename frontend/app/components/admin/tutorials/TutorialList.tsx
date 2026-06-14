'use client';

import { GraduationCap } from 'lucide-react';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';

// Embed styles are imported globally in app/globals.css.
import type { TutorialVideo } from './tutorialsData';

interface TutorialListProps {
  videos: TutorialVideo[];
}

/**
 * Presentational grid of video tutorials. Each card lazy-loads a lightweight
 * YouTube embed (only the thumbnail loads until the user clicks play).
 */
export function TutorialList({ videos }: TutorialListProps) {
  return (
    <div className="space-y-8">
      <header className="flex items-start gap-3">
        <GraduationCap
          size={24}
          className="mt-0.5 shrink-0 text-[var(--primary-blue)]"
          aria-hidden
        />
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-dark)]">
            Samouczki
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Krótkie filmy krok po kroku dla najważniejszych akcji w panelu.
          </p>
        </div>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {videos.map((video) => (
          <article
            key={video.id}
            className="flex flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card-bg)] transition-shadow hover:shadow-md"
          >
            <LiteYouTubeEmbed
              id={video.videoId}
              title={video.title}
              lazyLoad={true}
              webp={true}
              wrapperClass="yt-lite rounded-none"
            />
            <h2 className="px-5 py-4 text-sm font-semibold text-[var(--text-dark)]">
              {video.title}
            </h2>
          </article>
        ))}
      </div>
    </div>
  );
}
