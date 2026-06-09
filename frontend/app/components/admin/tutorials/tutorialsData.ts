export interface Tutorial {
  id: string;
  title: string;
  steps: string[];
}

export interface TutorialGroup {
  id: string;
  title: string;
  tutorials: Tutorial[];
}

/**
 * Short, text-based tutorials for the admin panel. Grouped by topic and easy to
 * extend: add a tutorial to an existing group or append a new group.
 */
export const tutorialGroups: TutorialGroup[] = [
  {
    id: 'quizzes',
    title: 'Quizy i pytania',
    tutorials: [
      {
        id: 'create-quiz',
        title: 'Tworzenie quizu',
        steps: [
          'W menu po lewej wybierz „Moje Quizy”.',
          'Kliknij przycisk tworzenia nowego quizu.',
          'Uzupełnij tytuł i (opcjonalnie) opis quizu.',
          'Zapisz quiz, aby przejść do dodawania pytań.',
        ],
      },
      {
        id: 'add-question',
        title: 'Dodawanie pytania',
        steps: [
          'Otwórz quiz w edytorze.',
          'Dodaj nowe pytanie i wybierz jego typ (jednokrotny, wielokrotny, prawda/fałsz, suwak).',
          'Wpisz treść pytania oraz odpowiedzi i oznacz poprawne.',
          'Ustaw liczbę punktów i limit czasu, jeśli są potrzebne, a następnie zapisz.',
        ],
      },
      {
        id: 'publish-quiz',
        title: 'Publikowanie quizu',
        steps: [
          'Przejdź do szczegółów quizu.',
          'Uruchom quiz, aby utworzyć aktywną sesję.',
          'Udostępnij uczestnikom kod PIN lub link do dołączenia.',
          'Zatrzymaj sesję, gdy quiz dobiegnie końca.',
        ],
      },
    ],
  },
  {
    id: 'results',
    title: 'Wyniki i statystyki',
    tutorials: [
      {
        id: 'check-results',
        title: 'Sprawdzanie wyników',
        steps: [
          'W menu wybierz „Statystyki”.',
          'Wybierz dzień, w którym odbył się quiz.',
          'Otwórz wybrany plik wyników, aby zobaczyć wyniki uczestników.',
        ],
      },
      {
        id: 'export-stats',
        title: 'Eksport statystyk',
        steps: [
          'Otwórz szczegóły wyników wybranego quizu.',
          'Użyj opcji eksportu, aby pobrać podstawowe statystyki w formacie CSV.',
          'Otwórz pobrany plik w arkuszu kalkulacyjnym, aby przeanalizować wyniki.',
        ],
      },
    ],
  },
];
