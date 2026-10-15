import { QuestionBank } from '../../model/exam.model';

export interface QuestionFormData {
  questionText: string;
  correctAnswer: boolean;
  isActive: boolean;
}

export function emptyQuestionForm(): QuestionFormData {
  return {
    questionText: '',
    correctAnswer: true,
    isActive: true
  };
}

export function questionFormFromBank(question: QuestionBank): QuestionFormData {
  return {
    questionText: question.questionText,
    correctAnswer: question.correctAnswer,
    isActive: question.isActive !== false
  };
}

export function questionFormError(data: Pick<QuestionFormData, 'questionText'>): string | null {
  if (!data.questionText.trim()) {
    return 'Tekst pitanja je obavezan.';
  }
  return null;
}

export const QUESTIONS_PAGE_SIZE = 10;

export function filterQuestionBank(questions: QuestionBank[], search: string): QuestionBank[] {
  const needle = search.trim().toLowerCase();
  if (!needle) {
    return questions;
  }
  return questions.filter((question) => question.questionText.toLowerCase().includes(needle));
}

export function paginateQuestions(
  questions: QuestionBank[],
  page: number,
  pageSize = QUESTIONS_PAGE_SIZE
): { page: number; totalPages: number; items: QuestionBank[] } {
  const totalPages = Math.ceil(questions.length / pageSize);
  let current = page;
  if (totalPages === 0) {
    current = 1;
  } else if (current > totalPages) {
    current = totalPages;
  } else if (current < 1) {
    current = 1;
  }
  const start = (current - 1) * pageSize;
  return {
    page: current,
    totalPages,
    items: questions.slice(start, start + pageSize)
  };
}

export function questionPageNumbers(page: number, totalPages: number): number[] {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export function correctAnswerLabel(value: boolean): string {
  return value ? 'Da' : 'Ne';
}
