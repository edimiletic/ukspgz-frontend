import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ExamAttempt, AttemptReview } from '../../model/exam.model';
import { ExamService } from '../../services/exam.service';

@Component({
  selector: 'app-exam-result',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-result.component.html',
  styleUrl: './exam-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExamResultComponent implements OnInit {
  result: ExamAttempt & { message: string } | null = null;
  autoSubmit = false;
  showConfetti = false;
  generatingRetakeExam = false;
  isLoading = true;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private examService: ExamService,
    private cdr: ChangeDetectorRef
  ) {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.result = navigation.extras.state['result'];
      this.autoSubmit = navigation.extras.state['autoSubmit'] || false;
    }
  }

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    if (this.result) {
      this.isLoading = false;
      this.showPassAnimation();
      return;
    }

    const attemptId = this.route.snapshot.paramMap.get('id');
    if (!attemptId) {
      this.router.navigate(['/exams']);
      return;
    }

    this.examService.getAttemptReview(attemptId).subscribe({
      next: (review: AttemptReview) => {
        this.result = {
          _id: review.attempt._id,
          userId: '',
          examId: review.exam?._id || '',
          answers: review.attempt.answers,
          score: review.attempt.score,
          passed: review.attempt.passed,
          completedAt: review.attempt.completedAt,
          timeSpent: review.attempt.timeSpent,
          message: review.attempt.passed
            ? 'Čestitamo! Uspješno ste položili ispit.'
            : 'Nažalost, niste položili ispit. Pokušajte ponovo.'
        };
        this.isLoading = false;
        this.refreshView();
        this.showPassAnimation();
      },
      error: () => {
        this.router.navigate(['/exams']);
      }
    });
  }

  private showPassAnimation(): void {
    if (this.result?.passed) {
      this.showConfetti = true;
      this.refreshView();
      setTimeout(() => {
        this.showConfetti = false;
        this.refreshView();
      }, 3000);
    }
  }

  getScorePercentage(): number {
    if (!this.result) return 0;
    return Math.round((this.result.score / 25) * 100);
  }

  getScoreClass(): string {
    if (!this.result) return 'score-neutral';
    
    const percentage = this.getScorePercentage();
    if (percentage >= 80) return 'score-excellent';
    if (percentage >= 60) return 'score-good';
    if (percentage >= 40) return 'score-average';
    return 'score-poor';
  }

  getResultIcon(): string {
    if (!this.result) return '📋';
    return this.result.passed ? '🎉' : '😔';
  }

  getResultTitle(): string {
    if (!this.result) return 'Rezultat ispita';
    return this.result.passed ? 'Čestitamo! Položili ste ispit!' : 'Nažalost, niste položili ispit';
  }

  getGradeDescription(): string {
    const percentage = this.getScorePercentage();
    
    if (percentage >= 90) return 'Odličan rezultat!';
    if (percentage >= 80) return 'Vrlo dobar rezultat!';
    if (percentage >= 70) return 'Dobar rezultat!';
    if (percentage >= 60) return 'Zadovoljavajući rezultat';
    if (percentage >= 40) return 'Nedovoljan rezultat';
    return 'Potrebno je više vježbanja';
  }

  formatTimeSpent(): string {
    if (!this.result) return '0 min';
    
    const minutes = this.result.timeSpent;
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }

  formatDate(): string {
    if (!this.result) return '';
    
    return new Date(this.result.completedAt).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  retakeExam(): void {
    this.generatingRetakeExam = true;

    this.examService.generateExam().subscribe({
      next: (exam) => {
        this.generatingRetakeExam = false;
        // Navigate directly to the new exam
        this.router.navigate(['/exams/take', exam._id]);
      },
      error: (err) => {
        this.generatingRetakeExam = false;
        console.error('Failed to generate retake exam:', err);
        // Fallback: go back to exams page
        this.router.navigate(['/exams']);
      }
    });
  }

  viewAllAttempts(): void {
    this.router.navigate(['/exams']);
  }

  reviewAnswers(): void {
    if (this.result?._id) {
      this.router.navigate(['/exams/review', this.result._id]);
    }
  }
}