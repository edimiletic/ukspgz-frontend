import { CommonModule } from '@angular/common';
import { Component, OnChanges,Input, Output, EventEmitter, SimpleChanges } from '@angular/core';
import { BasketballGame } from '../../../model/basketballGame.model';
import { ViewKontrolaData } from '../../../model/kontrola.model';
import { KontrolaService } from '../../../services/kontrola.service';

@Component({
  selector: 'app-view-kontrola-modal',
  imports: [CommonModule],
  templateUrl: './view-kontrola-modal.component.html',
  styleUrl: './view-kontrola-modal.component.scss'
})
export class ViewKontrolaModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() game: BasketballGame | null = null;
  @Input() currentUserId: string = '';
  @Output() close = new EventEmitter<void>();

  constructor(private kontrolaService: KontrolaService) {}


  kontrolaData: ViewKontrolaData | null = null;
  isLoading = false;
  errorMessage = '';

  // Grade display mappings
  gradeDisplayMap = {
    'Izvrsno': { label: 'Izvrsno', class: 'grade-excellent', icon: 'fas fa-star' },
    'Iznad Prosjeka': { label: 'Iznad Prosjeka', class: 'grade-above-average', icon: 'fas fa-thumbs-up' },
    'Prosječno': { label: 'Prosječno', class: 'grade-average', icon: 'fas fa-equals' },
    'Ispod Prosjeka': { label: 'Ispod Prosjeka', class: 'grade-below-average', icon: 'fas fa-thumbs-down' },
    'Loše': { label: 'Loše', class: 'grade-poor', icon: 'fas fa-times' }
  };

  tezinaDisplayMap = {
    'Lagana': { label: 'Lagana', class: 'difficulty-easy', icon: 'fas fa-smile' },
    'Prosječna': { label: 'Prosječna', class: 'difficulty-medium', icon: 'fas fa-meh' },
    'Teška': { label: 'Teška', class: 'difficulty-hard', icon: 'fas fa-frown' }
  };

gradeCategories = [
  { key: 'ocjena', label: 'Ocjena' }
];

// Create a separate array for detailed grades
detailedGradeCategories = [
  { key: 'pogreske', label: 'Pogreške' },
  { key: 'prekrsaji', label: 'Prekršaji' },
  { key: 'tehnikaMehanika', label: 'Tehnika i mehanika' },
  { key: 'timskiRad', label: 'Timski rad' },
  { key: 'kontrolaUtakmice', label: 'Kontrola utakmice' }
];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.game && this.currentUserId) {
      this.loadKontrolaData();
    }
  }

// Update loadKontrolaData method
// src/app/components/games-assigned/view-kontrola-modal/view-kontrola-modal.component.ts
// Update the loadKontrolaData method

async loadKontrolaData(): Promise<void> {
  if (!this.game) return;

  this.isLoading = true;
  this.errorMessage = '';

  try {
    const result = await this.kontrolaService.getMyKontrola(this.game._id).toPromise();
    this.kontrolaData = result || null; // Handle undefined case
  } catch (error) {
    console.error('Error loading kontrola:', error);
    this.errorMessage = 'Greška pri učitavanju kontrole.';
    this.kontrolaData = null;
  } finally {
    this.isLoading = false;
  }
}

  getGradeDisplay(gradeValue: string): any {
    return this.gradeDisplayMap[gradeValue as keyof typeof this.gradeDisplayMap] || 
           { label: gradeValue, class: '', icon: 'fas fa-question' };
  }

  getTezinaDisplay(tezinaValue: string): any {
    return this.tezinaDisplayMap[tezinaValue as keyof typeof this.tezinaDisplayMap] || 
           { label: tezinaValue, class: '', icon: 'fas fa-question' };
  }

  closeModal(): void {
    this.close.emit();
    this.kontrolaData = null;
    this.errorMessage = '';
  }

  // Helper method to get grade value by category key
  getGradeValue(categoryKey: string): string {
    if (!this.kontrolaData?.refereeGrade) return '';
    
    switch (categoryKey) {
      case 'ocjena': return this.kontrolaData.refereeGrade.ocjena; // Add this line
      case 'pogreske': return this.kontrolaData.refereeGrade.pogreske;
      case 'prekrsaji': return this.kontrolaData.refereeGrade.prekrsaji;
      case 'tehnikaMehanika': return this.kontrolaData.refereeGrade.tehnikaMehanika;
      case 'timskiRad': return this.kontrolaData.refereeGrade.timskiRad;
      case 'kontrolaUtakmice': return this.kontrolaData.refereeGrade.kontrolaUtakmice;
      default: return '';
    }
  }
}
