import { Exam, ExamAttempt, ExamAttemptUser } from '../../model/exam.model';

export function attemptUserName(attempt: ExamAttempt): string {
  const user = attempt.userId;
  if (!user) {
    return 'Nepoznat korisnik';
  }
  if (typeof user === 'string') {
    return 'Korisnik';
  }
  const named = user as ExamAttemptUser;
  const fullName = `${named.name || ''} ${named.surname || ''}`.trim();
  return fullName || named.username || 'Nepoznat korisnik';
}

export function filterExamAttempts(attempts: ExamAttempt[], search: string): ExamAttempt[] {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return attempts;
  }
  return attempts.filter((attempt) => {
    const title = typeof attempt.examId === 'object' && attempt.examId
      ? (attempt.examId as Exam).title || ''
      : '';
    return (
      attemptUserName(attempt).toLowerCase().includes(needle) ||
      title.toLowerCase().includes(needle)
    );
  });
}
