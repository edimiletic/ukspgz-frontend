import {
  correctAnswerLabel,
  emptyQuestionForm,
  filterQuestionBank,
  paginateQuestions,
  questionFormError,
  questionFormFromBank,
  questionPageNumbers
} from './question-bank.helpers';
import { QuestionBank } from '../../model/exam.model';

function question(partial: Partial<QuestionBank> & Pick<QuestionBank, '_id'>): QuestionBank {
  return {
    questionText: partial.questionText || 'Pitanje',
    correctAnswer: partial.correctAnswer ?? true,
    category: partial.category || 'Osnove igre',
    isActive: partial.isActive ?? true,
    ...partial
  };
}

describe('question-bank.helpers', () => {
  it('questionFormError traži tekst pitanja', () => {
    expect(questionFormError({ questionText: '  ' })).toBe('Tekst pitanja je obavezan.');
    expect(questionFormError(emptyQuestionForm())).toBe('Tekst pitanja je obavezan.');
    expect(questionFormError({ questionText: 'Je li ovo korak?' })).toBeNull();
  });

  it('questionFormFromBank prenosi točan odgovor i aktivnost', () => {
    const form = questionFormFromBank(
      question({ _id: 'q1', questionText: 'Faul?', correctAnswer: false, isActive: false, category: 'Prekršaji' })
    );
    expect(form.correctAnswer).toBeFalse();
    expect(form.isActive).toBeFalse();
  });

  it('filterQuestionBank filtrira po tekstu pitanja', () => {
    const bank = [
      question({ _id: '1', questionText: 'Je li korak prekršaj?', category: 'Koračanje' }),
      question({ _id: '2', questionText: 'Traje li napad 24s?', category: 'Shot clock' })
    ];
    expect(filterQuestionBank(bank, 'korak').map((item) => item._id)).toEqual(['1']);
    expect(filterQuestionBank(bank, 'nema').length).toBe(0);
  });

  it('paginateQuestions daje 10 po stranici i steže broj stranice', () => {
    const bank = Array.from({ length: 23 }, (_, index) => question({ _id: String(index + 1) }));
    expect(paginateQuestions(bank, 1).items.length).toBe(10);
    expect(paginateQuestions(bank, 3).items.map((item) => item._id)).toEqual(['21', '22', '23']);
    expect(paginateQuestions(bank, 9).page).toBe(3);
    expect(paginateQuestions([], 4)).toEqual({ page: 1, totalPages: 0, items: [] });
    expect(questionPageNumbers(1, 5)).toEqual([1, 2, 3]);
  });

  it('correctAnswerLabel je Da ili Ne', () => {
    expect(correctAnswerLabel(true)).toBe('Da');
    expect(correctAnswerLabel(false)).toBe('Ne');
  });
});
