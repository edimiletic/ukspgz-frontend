// src/app/components/exams/delete-exam-modal/delete-exam-modal.component.ts

import { Component, Input, EventEmitter, Output, OnChanges, SimpleChanges } from '@angular/core';
import { ExamAttempt } from '../../../model/exam.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-exam-modal',
  imports: [CommonModule],
  templateUrl: './delete-exam-modal.component.html',
  styleUrl: './delete-exam-modal.component.scss'
})
export class DeleteExamModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() attemptToDelete: ExamAttempt | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<string>();

  isDeleting = false;

  // ADD THIS: Reset isDeleting when modal opens
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.isDeleting = false; // Reset when modal opens
    }
  }

  onClose(): void {
    if (!this.isDeleting) {
      this.isDeleting = false; // Reset on close
      this.close.emit();
    }
  }

  onConfirm(): void {
    if (this.attemptToDelete && !this.isDeleting) {
      this.isDeleting = true;
      this.deleteConfirmed.emit(this.attemptToDelete._id);
      // Don't reset here - let parent handle it via closeDeleteAttemptModal
    }
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && !this.isDeleting) {
      this.onClose();
    }
  }

  getExamTitle(attempt: ExamAttempt): string {
    if (!attempt.examId) {
      return 'Sudački Ispit (Obrisan)';
    }
    
    if (typeof attempt.examId === 'object' && attempt.examId.title) {
      return attempt.examId.title;
    }
    
    return 'Sudački Ispit';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getAttemptStatusText(attempt: ExamAttempt): string {
    return attempt.passed ? 'Položen' : 'Nepoložen';
  }
}