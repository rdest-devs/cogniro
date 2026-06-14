export interface TutorialVideo {
  id: string;
  /** YouTube video id (the 11-character `watch?v=` identifier). */
  videoId: string;
  title: string;
}

/**
 * Video tutorials for the admin panel, sourced from the project's YouTube
 * playlist. Ordered as in the playlist; add a new entry to extend.
 *
 * Playlist: https://www.youtube.com/playlist?list=PLbbuoTzR4LrqQLC1Vu6NsKdQ9fWe-zAwt
 */
export const tutorialVideos: TutorialVideo[] = [
  {
    id: 'create-quiz',
    videoId: '_B7ga6-G4M0',
    title: 'Samouczek 1 - Tworzenie quizu i wszystkich typów pytań',
  },
  {
    id: 'question-time-limit',
    videoId: 'LzLGSGtA87U',
    title: 'Samouczek 2 - Limit czasu dla pojedynczego pytania',
  },
  {
    id: 'quiz-time-limit',
    videoId: 'WIPTi2yt6is',
    title: 'Samouczek 3 - Globalny limit czasu quizu',
  },
  {
    id: 'shuffle-questions',
    videoId: 'f2VXcSjLZo4',
    title: 'Samouczek 4 - Losowa kolejność pytań',
  },
  {
    id: 'feedback',
    videoId: 'SbWW4775ayA',
    title: 'Samouczek 5 - Feedback po zakończeniu quizu',
  },
  {
    id: 'question-preview',
    videoId: 'XlUsTDCibQE',
    title: 'Samouczek 6 - Podgląd pytania przed publikacją',
  },
  {
    id: 'publish-now',
    videoId: 'H1JKmAeiO0A',
    title: 'Samouczek 7 - Publikowanie quizu od razu',
  },
  {
    id: 'schedule-quiz',
    videoId: 'd4L_GmR0CME',
    title: 'Samouczek 8 - Planowanie quizu na konkretny termin',
  },
  {
    id: 'leaderboard-stats',
    videoId: 'D0-hP58u3bE',
    title: 'Samouczek 9 - Leaderboard i statystyki quizu',
  },
  {
    id: 'export',
    videoId: 'FplQkRZ0R54',
    title: 'Samouczek 10 - Eksport quizu i wyników',
  },
  {
    id: 'join-quiz',
    videoId: '-JNtfvW_bSE',
    title: 'Samouczek 11 - Dołączanie uczestnika do quizu',
  },
  {
    id: 'availability-states',
    videoId: 'qGbiZtSOtm8',
    title: 'Samouczek 12 - Stany dostępności quizu',
  },
  {
    id: 'import-zip',
    videoId: 'Uj_M7-RjGsM',
    title: 'Samouczek 13 - Import quizu z pliku zip',
  },
  {
    id: 'ban-participant',
    videoId: 'adxhZJ_WN-8',
    title: 'Samouczek 14 - Blokowanie (ban) uczestnika',
  },
  {
    id: 'live-quiz',
    videoId: 'Ay84meVc9s4',
    title: 'Samouczek 15 - Prowadzenie quizu na żywo',
  },
];
