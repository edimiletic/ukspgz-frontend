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
  });
});
