import { User } from './../../model/user.model';
import { Exam, ExamStats, ExamAttempt, QuestionBank } from './../../model/exam.model';
// src/app/components/exams/exams.component.ts
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ExamService } from '../../services/exam.service';
import { AuthService } from '../../services/login.service';
import { AddQuestionModalComponent } from "./add-question-modal/add-question-modal.component";

@Component({
  selector: 'app-exams',
  standalone: true,
  imports: [CommonModule, HeaderComponent, FooterComponent, AddQuestionModalComponent, RouterModule],
  templateUrl: './exams.component.html',
  styleUrl: './exams.component.scss'
})
export class ExamsComponent implements OnInit {
  currentUser: User | null = null;
  currentExam: Exam | null = null;
  userAttempts: ExamAttempt[] = [];
  examStats: ExamStats | null = null;
  loading = false;
  generatingExam = false;
  error: string | null = null;
  showAddQuestionModal = false;

  // Toast notification properties
  successMessage: string | null = null;
  errorMessage: string | null = null;

  constructor(
    private examService: ExamService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadCurrentExam();
    this.loadUserAttempts();
    this.loadExamStats();
  }

  loadCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user: User) => {
        this.currentUser = user;
      },
      error: (err) => {
        console.error('Failed to load user:', err);
        this.showErrorToast('Greška prilikom učitavanja korisničkih podataka.');
      }
    });
  }

  loadCurrentExam(): void {
    this.examService.getCurrentExam().subscribe({
      next: (exam: Exam) => {
        this.currentExam = exam;
      },
      error: (err) => {
        if (err.status !== 404) {
          console.error('Failed to load current exam:', err);
          this.showErrorToast('Greška prilikom učitavanja trenutnog ispita.');
        }
        // No active exam is normal
      }
    });
  }

  loadUserAttempts(): void {
    this.loading = true;
    this.examService.getUserAttempts().subscribe({
      next: (attempts: ExamAttempt[]) => {
        console.log('Loaded exam attempts:', attempts); // Debug log
        this.userAttempts = attempts;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load user attempts:', err);
        this.loading = false;
        this.showErrorToast('Greška prilikom učitavanja vaših pokušaja.');
      }
    });
  }

  loadExamStats(): void {
    if (this.currentUser?.role === 'Admin') {
      this.examService.getExamStats().subscribe({
        next: (stats: ExamStats) => {
          this.examStats = stats;
        },
        error: (err) => {
          console.error('Failed to load exam stats:', err);
          this.showErrorToast('Greška prilikom učitavanja statistika ispita.');
        }
      });
    }
  }

  startNewExam(): void {
    this.generatingExam = true;
    this.error = null;
    this.clearMessages();

    this.examService.generateExam().subscribe({
      next: (exam: Exam) => {
        this.generatingExam = false;
        this.currentExam = exam;
        this.showSuccessToast('Ispit je uspješno generiran! Preusmjeravam vas...');
        
        // Navigate to exam taking page immediately
        console.log('Navigating to exam with ID:', exam._id);
        this.router.navigate(['/exams/take', exam._id]);
      },
      error: (err) => {
        this.generatingExam = false;
        console.error('Failed to generate exam:', err);
        const errorMsg = err.error?.error || 'Greška prilikom kreiranja ispita. Pokušajte ponovo.';
        this.error = errorMsg;
        this.showErrorToast(errorMsg);
      }
    });
  }

  continueExistingExam(): void {
    if (this.currentExam) {
      this.showSuccessToast('Nastavljam s postojećim ispitom...');
      setTimeout(() => {
        this.router.navigate(['/exams/take', this.currentExam!._id]);
      }, 1000);
    }
  }

  openAddQuestionModal(): void {
    this.showAddQuestionModal = true;
  }

  closeAddQuestionModal(): void {
    this.showAddQuestionModal = false;
  }

  onQuestionAdded(newQuestion: QuestionBank): void {
    // Refresh stats after adding a question
    this.loadExamStats();
    this.showSuccessToast(`Pitanje "${newQuestion.questionText.substring(0, 50)}..." je uspješno dodano!`);
    console.log('New question added:', newQuestion);
  }

  // Toast notification methods
  showSuccessToast(message: string): void {
    this.clearMessages();
    this.successMessage = message;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.successMessage = null;
    }, 5000);
  }

  showErrorToast(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    
    // Auto-hide after 7 seconds (longer for errors)
    setTimeout(() => {
      this.errorMessage = null;
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = null;
    this.errorMessage = null;
  }

  getAttemptStatusClass(attempt: ExamAttempt): string {
    return attempt.passed ? 'status-passed' : 'status-failed';
  }

  getAttemptStatusText(attempt: ExamAttempt): string {
    return attempt.passed ? 'Položen' : 'Nepoložen';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTimeSpent(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }

  getExamTitle(attempt: ExamAttempt): string {
    // Handle case where examId is null or invalid
    if (!attempt.examId) {
      return 'Sudački Ispit (Obrisan)';
    }
    
    if (typeof attempt.examId === 'object' && attempt.examId.title) {
      return attempt.examId.title;
    }
    
    return 'Sudački Ispit';
  }

  isExamExpired(): boolean {
    if (!this.currentExam) return false;
    return new Date(this.currentExam.expiresAt) < new Date();
  }

  getTimeRemaining(): string {
    if (!this.currentExam) return '';
    
    const now = new Date();
    const expires = new Date(this.currentExam.expiresAt);
    const diff = expires.getTime() - now.getTime();
    
    if (diff <= 0) return 'Istekao';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}min`;
  }

  isAdmin(): boolean {
    return this.currentUser?.role === 'Admin';
  }

  deleteAttempt(attemptId: string): void {
    if (confirm('Jeste li sigurni da želite obrisati ovaj pokušaj ispita?')) {
      this.examService.deleteExamAttempt(attemptId).subscribe({
        next: (response) => {
          this.showSuccessToast('Pokušaj ispita je uspješno obrisan.');
          this.loadUserAttempts(); // Refresh the list
        },
        error: (err) => {
          console.error('Failed to delete attempt:', err);
          this.showErrorToast('Greška prilikom brisanja pokušaja ispita.');
        }
      });
    }
  }

  reviewAttempt(attempt: ExamAttempt): void {
    // Navigate to review page with attempt data
    this.router.navigate(['/exams/review', attempt._id]);
  }
}