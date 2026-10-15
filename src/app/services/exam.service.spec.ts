import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ExamService } from './exam.service';
import { environment } from '../../environments/environment';

describe('ExamService', () => {
  let service: ExamService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/exams`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ExamService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('generira ispit i dohvaća trenutni', () => {
    service.generateExam().subscribe();
    const generate = http.expectOne(`${base}/generate`);
    expect(generate.request.method).toBe('POST');
    generate.flush({ _id: 'ex1' });

    service.getCurrentExam().subscribe(exam => {
      expect(exam._id).toBe('ex1');
    });
    const current = http.expectOne(`${base}/current`);
    expect(current.request.method).toBe('GET');
    current.flush({ _id: 'ex1' });
  });

  it('šalje ispit i dohvaća pregled pokušaja', () => {
    const submission = { examId: 'ex1', answers: [], timeSpent: 12 };
    service.submitExam(submission).subscribe();
    const submit = http.expectOne(`${base}/submit`);
    expect(submit.request.method).toBe('POST');
    expect(submit.request.body).toEqual(submission);
    submit.flush({ _id: 'at1', message: 'ok' });

    service.getAttemptReview('at1').subscribe();
    const review = http.expectOne(`${base}/attempts/at1/review`);
    expect(review.request.method).toBe('GET');
    review.flush({ attempt: { _id: 'at1' }, exam: null, user: { name: 'Iva' } });
  });

  it('dodaje pitanje i briše pokušaj', () => {
    service.addQuestion({ questionText: 'Je li ovo faul?', correctAnswer: true }).subscribe();
    const add = http.expectOne(`${base}/questions`);
    expect(add.request.method).toBe('POST');
    add.flush({ _id: 'q1' });

    service.deleteExamAttempt('at1').subscribe();
    const del = http.expectOne(`${base}/attempts/at1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'ok' });

    service.getAllAttempts().subscribe((list) => {
      expect(list.length).toBe(1);
    });
    const all = http.expectOne(`${base}/attempts/all`);
    expect(all.request.method).toBe('GET');
    all.flush([{ _id: 'at1' }]);
  });

  it('dohvaća, mijenja i briše pitanje u bazi', () => {
    service.getQuestionBank().subscribe((list) => {
      expect(list.length).toBe(1);
    });
    const list = http.expectOne(`${base}/questions`);
    expect(list.request.method).toBe('GET');
    list.flush([{ _id: 'q1', questionText: 'Faul?' }]);

    service.updateQuestion('q1', { correctAnswer: false }).subscribe();
    const update = http.expectOne(`${base}/questions/q1`);
    expect(update.request.method).toBe('PUT');
    update.flush({ _id: 'q1', correctAnswer: false });

    service.deleteQuestion('q1').subscribe();
    const remove = http.expectOne(`${base}/questions/q1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ message: 'ok' });
  });
});
