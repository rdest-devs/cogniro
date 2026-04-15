import type {
  ImageAnswerOption,
  Question,
  QuizCard,
  QuizInfo,
  RankingEntry,
  ResultRow,
  ReviewQuestion,
} from '@/app/types';

export const quizStartDemo = {
  title: 'Quiz Informatyczny',
  description:
    'Sprawdź swoją wiedzę z zakresu informatyki! Odpowiedz na pytania i zdobądź jak najwięcej punktów.',
  logoUrl: '/images/wi-new-logo.png',
};

export const singleChoiceDemo = {
  questionNumber: 3,
  totalQuestions: 10,
  time: '0:42',
  question:
    'Który protokół jest używany do bezpiecznego przesyłania danych w sieci?',
  answers: ['HTTP', 'HTTPS', 'FTP', 'SMTP'],
};

export const multipleChoiceDemo = {
  questionNumber: 5,
  totalQuestions: 10,
  time: '1:15',
  question: 'Które z poniższych są językami programowania?',
  hint: 'Wybierz wszystkie poprawne odpowiedzi',
  answers: ['Python', 'HTML', 'Java', 'CSS'],
};

export const imageQuestionDemo = {
  questionNumber: 7,
  totalQuestions: 10,
  time: '0:58',
  question: 'Który schemat blokowy przedstawia pętlę while?',
  imageUrl: '/images/flowchart.png',
  answers: ['Schemat A', 'Schemat B', 'Schemat C'],
};

export const imageAnswersDemo = {
  questionNumber: 9,
  totalQuestions: 10,
  time: '0:33',
  question:
    'Który z poniższych obrazków przedstawia strukturę drzewa binarnego?',
  answers: [
    { imageUrl: '/images/diagram-a.png', label: 'A' },
    { imageUrl: '/images/diagram-b.png', label: 'B' },
    { imageUrl: '/images/diagram-c.png', label: 'C' },
    { imageUrl: '/images/diagram-d.png', label: 'D' },
  ] satisfies ImageAnswerOption[],
};

export const orderingDemo = {
  questionNumber: 6,
  totalQuestions: 10,
  time: '1:05',
  question: 'Ułóż etapy kompilacji programu w odpowiedniej kolejności',
  hint: 'Przeciągnij elementy, aby ustalić kolejność',
  items: [
    'Analiza leksykalna',
    'Analiza składniowa',
    'Generowanie kodu',
    'Optymalizacja',
  ],
};

export const sliderQuestionDemo = {
  questionNumber: 8,
  totalQuestions: 10,
  time: '0:38',
  question: 'Ile bitów ma adres IPv4?',
  hint: 'Wybierz wartość za pomocą suwaka',
  min: 0,
  max: 128,
  step: 1,
  defaultValue: 32,
  unit: 'bitów',
  ticks: [0, 32, 64, 96, 128],
};

export const rangeSliderDemo = {
  questionNumber: 5,
  totalQuestions: 10,
  time: '1:22',
  question: 'Oceń swoją pewność w zakresie programowania obiektowego',
  hint: 'Przesuń suwak, aby wybrać wartość od 1 do 10',
  min: 1,
  max: 10,
  defaultValue: 7,
  lowLabel: 'Niska pewność',
  highLabel: 'Wysoka pewność',
};

export const quizResultsDemo = {
  scorePercent: 78,
  scorePoints: 8,
  scoreTotal: 10,
  message: 'Świetny wynik! Jesteś w czołówce wydziału.',
  ranking: [
    { position: 1, name: 'Anna Kowalska', score: '96%', medal: 'gold' },
    { position: 2, name: 'Piotr Nowak', score: '91%', medal: 'silver' },
    { position: 3, name: 'Maja Wiśniewska', score: '85%', medal: 'bronze' },
    { position: 4, name: 'Ty', score: '78%', isYou: true },
    { position: 5, name: 'Kamil Zieliński', score: '72%' },
  ] satisfies RankingEntry[],
};

export const attemptReviewDemo = {
  correctCount: 1,
  wrongCount: 1,
  scorePercent: 50,
  questions: [
    {
      number: 1,
      text: 'Który protokół jest używany do bezpiecznego przesyłania danych w sieci?',
      isCorrect: true,
      answers: [
        { text: 'HTTP', state: 'neutral' },
        { text: 'HTTPS', state: 'correct-selected' },
        { text: 'FTP', state: 'neutral' },
        { text: 'SMTP', state: 'neutral' },
      ],
    },
    {
      number: 2,
      text: 'Które z poniższych są językami programowania?',
      isCorrect: false,
      answers: [
        {
          text: 'Python, HTML, CSS',
          state: 'wrong-selected',
          yourAnswer: true,
        },
        { text: 'Python, Java, C++', state: 'correct' },
        { text: 'HTML, CSS, SQL', state: 'neutral' },
        { text: 'Word, Excel, PowerPoint', state: 'neutral' },
      ],
    },
  ] satisfies ReviewQuestion[],
};

export const adminPanelDemo = {
  quizzes: [
    {
      id: '1',
      title: 'Quiz z Informatyki',
      questionsCount: 10,
      responsesCount: 48,
      createdAt: '12 mar 2026',
      status: 'Aktywny',
    },
    {
      id: '2',
      title: 'Algorytmy i Struktury Danych',
      questionsCount: 15,
      responsesCount: 32,
      createdAt: '6 mar 2026',
      status: 'Aktywny',
    },
    {
      id: '3',
      title: 'Bazy Danych SQL',
      questionsCount: 8,
      responsesCount: 0,
      createdAt: '15 mar 2026',
      status: 'Stare',
    },
    {
      id: '4',
      title: 'Sieci Komputerowe',
      questionsCount: 12,
      responsesCount: 65,
      createdAt: '1 mar 2026',
      status: 'Zakończony',
    },
  ] satisfies QuizCard[],
};

export const quizDetailDemo = {
  quizzes: [
    {
      id: '1',
      title: 'Quiz z Informatyki',
      status: 'Aktywny',
      date: '12 mar 2026',
      participants: 48,
      avgScore: 76,
    },
    {
      id: '2',
      title: 'Algorytmy i Struktury Danych',
      status: 'Stare',
      date: '6 mar 2026',
      participants: 32,
      avgScore: 82,
    },
  ] satisfies QuizInfo[],
  selectedQuiz: 'Quiz z Informatyki',
  results: [
    { name: 'Anna Kowalska', score: 96, time: '4:32', date: '12 mar 2026' },
    { name: 'Piotr Nowak', score: 91, time: '5:18', date: '12 mar 2026' },
    {
      name: 'Maja Wiśniewska',
      score: 85,
      time: '6:45',
      date: '13 mar 2026',
    },
    { name: 'Kamil Zieliński', score: 78, time: '7:02', date: '14 mar 2026' },
    { name: 'Ewa Jabłońska', score: 72, time: '8:15', date: '14 mar 2026' },
  ] satisfies ResultRow[],
};

export const quizEditorDemo = {
  quizName: 'Quiz z Informatyki',
  timeLimit: 10,
  shuffleQuestions: true,
  accessibility: 'Publiczny',
  questions: [
    {
      id: 1,
      text: 'Który protokół jest używany do bezpiecznego przesyłania danych?',
      type: 'Jednokrotny',
      answers: [
        { text: 'HTTPS', isCorrect: true },
        { text: 'HTTP', isCorrect: false },
        { text: 'FTP', isCorrect: false },
      ],
      expanded: false,
    },
    {
      id: 2,
      text: 'Które z poniższych są językami programowania?',
      type: 'Wielokrotny',
      answers: [],
      expanded: false,
    },
    {
      id: 3,
      text: 'Który schemat blokowy przedstawia pętlę while?',
      type: 'Obrazkowy',
      answers: [
        { text: 'HTTPS', isCorrect: true },
        { text: 'HTTP', isCorrect: false },
        { text: 'FTP', isCorrect: false },
      ],
      expanded: true,
    },
  ] satisfies Question[],
};
