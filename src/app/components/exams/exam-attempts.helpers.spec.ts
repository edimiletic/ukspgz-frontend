import { ExamAttempt } from '../../model/exam.model';
import { attemptUserName, filterExamAttempts } from './exam-attempts.helpers';

function attempt(partial: Partial<ExamAttempt> & Pick<ExamAttempt, '_id'>): ExamAttempt {
  return {
    userId: { _id: 'u1', name: 'Iva', surname: 'Horvat' },
    examId: { _id: 'e1', title: 'Sudački ispit', questions: [], passingScore: 20, isCompleted: true, expiresAt: '', userId: 'u1' },
    answers: [],
    score: 21,
    passed: true,
    completedAt: '2026-10-15T08:00:00.000Z',
    timeSpent: 40,
    ...partial
  };
}

describe('exam-attempts.helpers', () => {
  it('attemptUserName slaže ime i prezime', () => {
    expect(attemptUserName(attempt({ _id: 'a1' }))).toBe('Iva Horvat');
    expect(attemptUserName(attempt({ _id: 'a2', userId: 'raw' }))).toBe('Korisnik');
  });

  it('filterExamAttempts traži po imenu', () => {
    const list = [
      attempt({ _id: 'a1' }),
      attempt({ _id: 'a2', userId: { _id: 'u2', name: 'Marko', surname: 'Kovač' } })
    ];
    expect(filterExamAttempts(list, 'kovač').map((item) => item._id)).toEqual(['a2']);
  });
});
