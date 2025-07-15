import { AbsenceService } from './../../services/absence.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { AbsenceData, TimeAbsentModalComponent } from './time-absent-modal/time-absent-modal.component';
import { Absence } from '../../model/absence.model';
import { DeleteTimeAbsentModalComponent } from "./delete-time-absent-modal/delete-time-absent-modal.component";
import { EditTimeAbsentModalComponent } from "./edit-time-absent-modal/edit-time-absent-modal.component";
@Component({
  selector: 'app-time-absent',
  imports: [HeaderComponent, FooterComponent, TimeAbsentModalComponent, CommonModule, DeleteTimeAbsentModalComponent, EditTimeAbsentModalComponent],
  templateUrl: './time-absent.component.html',
  styleUrl: './time-absent.component.scss'
})
export class TimeAbsentComponent {

  isModalOpen = false;
  absences: Absence[]= [];
  isLoading = false;
  isDeleteModalOpen = false;
  isEditModalOpen = false;
  absenceToEdit: Absence | null = null;
  absenceToDelete: Absence | null = null;

  constructor(private absenceService: AbsenceService) {}

  ngOnInit(){
    this.loadAbsences();
  }

   loadAbsences() {
    this.isLoading = true;
    this.absenceService.getCurrentUserAbsences().subscribe({
      next: (absences: Absence[]) => {
        this.absences = absences;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading absences:', error);
        this.isLoading = false;
      }
    });
  }

  formatDate(dateString: string): string{
    const date= new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day:'2-digit',
      month:'2-digit',
      year:'numeric'
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openEditModal(absence: Absence){
    this.absenceToEdit = absence;
    this.isEditModalOpen = true;
  }

  closeEditModal(){
    this.isEditModalOpen = false;
    this.absenceToEdit = null;
  }

  openDeleteModal(absence: Absence) {
    this.absenceToDelete = absence;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.absenceToDelete = null;
  }


    onAbsenceSaved() {
    // Handle successful absence creation
    // You might want to refresh the table data here
    console.log('Absence saved successfully!');
    this.loadAbsences();
    // Example: this.loadAbsences(); // Refresh the absence list
  }

    onAbsenceUpdated() {
    console.log('Absence updated successfully!');
    this.loadAbsences(); // Refresh the absence list
  }

    onAbsenceDeleted() {
    console.log('Absence deleted successfully!');
    this.loadAbsences(); // Refresh the absence list
  }
}
