import ProgressBar from '@/app/components/common/ProgressBar';
import { cn } from '@/lib/cn';

import QuestionHeader from './QuestionHeader';

interface QuizLayoutProps {
  questionNumber: number;
  totalQuestions: number;
  time: string;
  contentClassName?: string;
  children: React.ReactNode;
}

export default function QuizLayout({
  questionNumber,
  totalQuestions,
  time,
  contentClassName,
  children,
}: QuizLayoutProps) {
  return (
    <article className="flex h-full w-full max-w-[390px] flex-col bg-[var(--page-bg)]">
      <ProgressBar current={questionNumber} total={totalQuestions} />
      <QuestionHeader
        current={questionNumber}
        total={totalQuestions}
        time={time}
      />
      <section
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pt-6 pb-8',
          contentClassName,
        )}
      >
        {children}
      </section>
    </article>
  );
}
