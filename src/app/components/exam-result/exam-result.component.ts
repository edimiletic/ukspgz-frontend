import { Component, OnInit } from '@angular/core';
import { ExamAttempt } from '../../model/exam.model';
import { Router, RouterModule } from '@angular/router';
import { FooterComponent } from "../footer/footer.component";
import { HeaderComponent } from "../header/header.component";
import { CommonModule } from '@angular/common';
import { ExamService } from '../../services/exam.service';

@Component({
  selector: 'app-exam-result',
  imports: [FooterComponent, HeaderComponent, CommonModule, RouterModule],
  templateUrl: './exam-result.component.html',
  styleUrl: './exam-result.component.scss'
})
export class ExamResultComponent implements OnInit {
 result: ExamAttempt & { message: string } | null = null;
  autoSubmit = false;
  showConfetti = false;
  generatingRetakeExam = false;

  constructor(
    private router: Router,
    private examService: ExamService
  ) {
    // Get the result from navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state) {
      this.result = navigation.extras.state['result'];
      this.autoSubmit = navigation.extras.state['autoSubmit'] || false;
    }
  }

  ngOnInit(): void {
    if (!this.result) {
      // If no result data, redirect back to exams
      this.router.navigate(['/exams']);
      return;
    }

    // Show confetti animation if passed
    if (this.result.passed) {
      this.showConfetti = true;
      setTimeout(() => {
        this.showConfetti = false;
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

  downloadCertificate(): void {
    if (this.result?.passed) {
      // TODO: Implement certificate download functionality
      alert('Funkcionalnost preuzimanja certifikata će biti dostupna uskoro.');
    }
  }

  reviewAnswers(): void {
    if (this.result?._id) {
      this.router.navigate(['/exams/review', this.result._id]);
    }
  }
}