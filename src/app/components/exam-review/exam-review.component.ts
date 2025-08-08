import { Component } from '@angular/core';
import { AttemptReview, ReviewQuestion } from '../../model/exam.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ExamService } from '../../services/exam.service';
import { FooterComponent } from "../footer/footer.component";
import { HeaderComponent } from "../header/header.component";
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exam-review',
  imports: [FooterComponent, HeaderComponent, CommonModule, RouterModule],
  templateUrl: './exam-review.component.html',
  styleUrl: './exam-review.component.scss'
})
export class ExamReviewComponent {
  reviewData: AttemptReview | null = null;
  reviewQuestions: ReviewQuestion[] = [];
  loading = true;
  error: string | null = null;
  
  // Filter options
  showFilter: 'all' | 'correct' | 'incorrect' | 'unanswered' = 'all';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService
  ) {}

  ngOnInit(): void {
    const attemptId = this.route.snapshot.paramMap.get('id');
    if (attemptId) {
      this.loadAttemptReview(attemptId);
    } else {
      this.error = 'Neispravni ID pokušaja.';
      this.loading = false;
    }
  }

  loadAttemptReview(attemptId: string): void {
    this.examService.getAttemptReview(attemptId).subscribe({
      next: (data: AttemptReview) => {
        this.reviewData = data;
        this.processReviewData();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load attempt review:', err);
        this.error = 'Greška prilikom učitavanja pregleda pokušaja.';
        this.loading = false;
      }
    });
  }

  processReviewData(): void {
    if (!this.reviewData?.exam?.questions) {
      this.error = 'Podaci o ispitu nisu dostupni.';
      return;
    }

    this.reviewQuestions = this.reviewData.exam.questions.map((question, index) => {
      const userAnswerData = this.reviewData!.attempt.answers.find(a => a.questionIndex === index);
      const userAnswer = userAnswerData ? userAnswerData.answer : null;
      
      return {
        questionText: question.questionText,
        correctAnswer: question.correctAnswer,
        userAnswer: userAnswer,
        isCorrect: userAnswer !== null && userAnswer === question.correctAnswer,
        questionIndex: index
      };
    });
  }

  getFilteredQuestions(): ReviewQuestion[] {
    switch (this.showFilter) {
      case 'correct':
        return this.reviewQuestions.filter(q => q.isCorrect);
      case 'incorrect':
        return this.reviewQuestions.filter(q => q.userAnswer !== null && !q.isCorrect);
      case 'unanswered':
        return this.reviewQuestions.filter(q => q.userAnswer === null);
      default:
        return this.reviewQuestions;
    }
  }

  getCorrectCount(): number {
    return this.reviewQuestions.filter(q => q.isCorrect).length;
  }

  getIncorrectCount(): number {
    return this.reviewQuestions.filter(q => q.userAnswer !== null && !q.isCorrect).length;
  }

  getUnansweredCount(): number {
    return this.reviewQuestions.filter(q => q.userAnswer === null).length;
  }

  getScorePercentage(): number {
    if (!this.reviewData) return 0;
    return Math.round((this.reviewData.attempt.score / 25) * 100);
  }

  formatDate(): string {
    if (!this.reviewData) return '';
    return new Date(this.reviewData.attempt.completedAt).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTimeSpent(): string {
    if (!this.reviewData) return '0 min';
    
    const minutes = this.reviewData.attempt.timeSpent;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }

  getAnswerText(answer: boolean | null): string {
    if (answer === null) return 'Neodgovoreno';
    return answer ? 'Da' : 'Ne';
  }

  getAnswerClass(question: ReviewQuestion): string {
    if (question.userAnswer === null) return 'answer-unanswered';
    return question.isCorrect ? 'answer-correct' : 'answer-incorrect';
  }

  goBack(): void {
    this.router.navigate(['/exams']);
  }
}