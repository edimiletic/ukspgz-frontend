// src/app/components/games-assigned/edit-game-modal/edit-game-modal.component.ts
import { CommonModule } from '@angular/common';
import { BasketballGame, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { UserService } from '../../../services/user.service';
import { BasketballGameService } from './../../../services/basketballGame.service';
import { AbsenceService } from '../../../services/absence.service';
import { Absence } from '../../../model/absence.model';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-game-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-game-modal.component.html',
  styleUrl: './edit-game-modal.component.scss'
})
export class EditGameModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() game: BasketballGame | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() gameUpdated = new EventEmitter<any>();

  // Form data
  gameForm: GameFormData = {
    homeTeam: '',
    awayTeam: '',
    date: '',
    time: '',
    venue: '',
    competition: '',
    notes: '',
    status: 'Scheduled'
  };

  // Referee data
  availableReferees: {
    sudci: User[];
    delegati: User[];
    pomocniSudci: User[];
  } = {
    sudci: [],
    delegati: [],
    pomocniSudci: []
  };

  selectedReferees: RefereeSelection = {
    sudci: [],
    delegat: '',
    pomocniSudci: []
  };

  // Competition options
  competitions = [
    'FAVBET PREMIJER LIGA',
    'KUP «K. ĆOSIĆ»',
    'PRVA MUŠKA LIGA',
    'ZAVRŠNI TURNIR ZA POPUNU PRVE MUŠKE LIGE',
    'DRUGE MUŠKE LIGE',
    'TREĆE MUŠKE LIGE',
    'ČETVRTE MUŠKE LIGE',
    'PREMIJER ŽENSKA LIGA',
    'PRVA ŽENSKA LIGA',
    'KUP «R. MEGLAJ-RIMAC»',
    'JUNIORI',
    'JUNIORKE',
    'KADETI',
    'KADETKINJE',
    'MLAĐI KADETI',
    'MLAĐE KADETKINJE',
    'DJEČACI I DJEVOJČICE',
    'NATJECANJE SREDNJIH ŠKOLA',
    'NATJECANJE OSNOVNIH ŠKOLA',
    'Natjecanje MINI KOŠARKA',
    '3X3'
  ];

  // Status options
  statusOptions = [
    { value: 'Scheduled', label: 'Zakazano' },
    { value: 'Ongoing', label: 'U tijeku' },
    { value: 'Completed', label: 'Završeno' },
    { value: 'Cancelled', label: 'Otkazano' }
  ];

  // State management
  isLoading = false;
  isLoadingReferees = false;
  isLoadingAbsences = false;
  errorMessage = '';
  currentStep = 1; // 1: Game details, 2: Referee assignments

  // Absence data for availability checking
  allAbsences: Absence[] = [];

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService,
    private absenceService: AbsenceService
  ) {}

  ngOnInit() {
    if (this.isOpen && this.game) {
      this.loadReferees();
      this.loadAbsences();
      this.populateForm();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.game) {
      this.loadReferees();
      this.loadAbsences();
      this.populateForm();
      this.currentStep = 1;
      this.errorMessage = '';
    }
  }

  loadAbsences() {
    this.isLoadingAbsences = true;
    this.absenceService.getAllAbsences().subscribe({
      next: (absences) => {
        this.allAbsences = absences;
        this.isLoadingAbsences = false;
        console.log('Loaded absences for edit modal:', absences.length);
        console.log('Sample absence:', absences[0]); // Debug: check absence structure
      },
      error: (error) => {
        console.error('Error loading absences in edit modal:', error);
        this.allAbsences = []; // Continue without absence checking
        this.isLoadingAbsences = false;
      }
    });
  }

  populateForm() {
    if (!this.game) return;

    // Populate game form
    this.gameForm = {
      homeTeam: this.game.homeTeam,
      awayTeam: this.game.awayTeam,
      date: this.game.date.split('T')[0], // Convert to YYYY-MM-DD format
      time: this.game.time,
      venue: this.game.venue,
      competition: this.game.competition,
      notes: this.game.notes || '',
      status: this.game.status
    };

    // Populate referee assignments
    this.populateRefereeAssignments();
  }

  populateRefereeAssignments() {
    if (!this.game) return;

    const sudci: { _id?: string; userId: string; position: number }[] = [];
    const pomocniSudci: { _id?: string; userId: string; position: number }[] = [];
    let delegat = '';

    this.game.refereeAssignments.forEach(assignment => {
      switch (assignment.role) {
        case 'Sudac':
          sudci.push({
            _id: assignment._id,
            userId: assignment.userId._id,
            position: assignment.position
          });
          break;
        case 'Delegat':
          delegat = assignment.userId._id;
          break;
        case 'Pomoćni Sudac':
          pomocniSudci.push({
            _id: assignment._id,
            userId: assignment.userId._id,
            position: assignment.position
          });
          break;
      }
    });

    // Sort by position and ensure minimum assignments
    sudci.sort((a, b) => a.position - b.position);
    pomocniSudci.sort((a, b) => a.position - b.position);

    // Ensure minimum 2 sudci and 2 pomoćni sudci
    while (sudci.length < 2) {
      sudci.push({ userId: '', position: sudci.length + 1 });
    }
    while (pomocniSudci.length < 2) {
      pomocniSudci.push({ userId: '', position: pomocniSudci.length + 1 });
    }

    this.selectedReferees = {
      sudci,
      delegat,
      pomocniSudci
    };
  }

  loadReferees() {
    this.isLoadingReferees = true;
    this.userService.getReferees().subscribe({
      next: (referees) => {
        this.availableReferees = {
          sudci: referees.filter(ref => ref.role === 'Sudac'),
          delegati: referees.filter(ref => ref.role === 'Delegat'),
          pomocniSudci: referees.filter(ref => ref.role === 'Pomoćni Sudac')
        };
        this.isLoadingReferees = false;
        console.log('Sample referee:', referees[0]); // Debug: check referee structure
        console.log('Referee fields:', Object.keys(referees[0] || {})); // Debug: check available fields
      },
      error: (error) => {
        console.error('Error loading referees:', error);
        this.errorMessage = 'Greška pri učitavanju sudaca.';
        this.isLoadingReferees = false;
      }
    });
  }

  // Check if a referee is available on the game date
  private isRefereeAvailable(referee: User, gameDate: string): boolean {
    if (!gameDate || this.allAbsences.length === 0) {
      return true; // If no date selected or no absences loaded, assume available
    }

    const selectedGameDate = new Date(gameDate);
    selectedGameDate.setHours(0, 0, 0, 0);

    // Check if referee has any absence that overlaps with game date
    const hasConflict = this.allAbsences.some(absence => {
      // Match by personal code since absences store userPersonalCode
      if (absence.userPersonalCode !== referee.personalCode) {
        return false;
      }

      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      
      // Reset times for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      // Check if game date falls within absence period
      const isConflict = selectedGameDate >= startDate && selectedGameDate <= endDate;
      
      // Debug logging
      if (isConflict) {
        console.log(`Referee ${referee.name} ${referee.surname} (${referee.personalCode}) is unavailable on ${gameDate}:`, {
          absence: absence,
          gameDate: selectedGameDate,
          startDate: startDate,
          endDate: endDate
        });
      }
      
      return isConflict;
    });

    return !hasConflict;
  }

  // Get count of unavailable referees for display
  getUnavailableRefereesCount(role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): number {
    if (!this.gameForm.date) return 0;

    let totalReferees = 0;
    let availableReferees = 0;

    switch (role) {
      case 'Sudac':
        totalReferees = this.availableReferees.sudci.length;
        availableReferees = this.availableReferees.sudci.filter(ref => 
          this.isRefereeAvailable(ref, this.gameForm.date)
        ).length;
        break;
      case 'Delegat':
        totalReferees = this.availableReferees.delegati.length;
        availableReferees = this.availableReferees.delegati.filter(ref => 
          this.isRefereeAvailable(ref, this.gameForm.date)
        ).length;
        break;
      case 'Pomoćni Sudac':
        totalReferees = this.availableReferees.pomocniSudci.length;
        availableReferees = this.availableReferees.pomocniSudci.filter(ref => 
          this.isRefereeAvailable(ref, this.gameForm.date)
        ).length;
        break;
    }

    return totalReferees - availableReferees;
  }

  // Check if date change should clear selected referees who are now unavailable
  onDateChange() {
    if (!this.gameForm.date) return;

    // Check if any selected referees are now unavailable and clear them
    this.selectedReferees.sudci.forEach((sudac, index) => {
      if (sudac.userId) {
        const referee = this.availableReferees.sudci.find(ref => ref._id === sudac.userId);
        if (referee && !this.isRefereeAvailable(referee, this.gameForm.date)) {
          this.selectedReferees.sudci[index].userId = '';
        }
      }
    });

    if (this.selectedReferees.delegat) {
      const delegat = this.availableReferees.delegati.find(ref => ref._id === this.selectedReferees.delegat);
      if (delegat && !this.isRefereeAvailable(delegat, this.gameForm.date)) {
        this.selectedReferees.delegat = '';
      }
    }

    this.selectedReferees.pomocniSudci.forEach((pomocni, index) => {
      if (pomocni.userId) {
        const referee = this.availableReferees.pomocniSudci.find(ref => ref._id === pomocni.userId);
        if (referee && !this.isRefereeAvailable(referee, this.gameForm.date)) {
          this.selectedReferees.pomocniSudci[index].userId = '';
        }
      }
    });
  }

  // Step navigation
  nextStep() {
    if (this.validateGameForm()) {
      this.currentStep = 2;
      this.errorMessage = '';
    }
  }

  previousStep() {
    this.currentStep = 1;
    this.errorMessage = '';
  }

  // Validation
  validateGameForm(): boolean {
    const { homeTeam, awayTeam, date, time, venue, competition } = this.gameForm;
    
    if (!homeTeam.trim()) {
      this.errorMessage = 'Domaći tim je obavezan.';
      return false;
    }
    
    if (!awayTeam.trim()) {
      this.errorMessage = 'Gostujući tim je obavezan.';
      return false;
    }
    
    if (homeTeam.toLowerCase().trim() === awayTeam.toLowerCase().trim()) {
      this.errorMessage = 'Domaći i gostujući tim ne mogu biti isti.';
      return false;
    }
    
    if (!date) {
      this.errorMessage = 'Datum je obavezan.';
      return false;
    }
    
    if (!time) {
      this.errorMessage = 'Vrijeme je obavezno.';
      return false;
    }
    
    if (!venue.trim()) {
      this.errorMessage = 'Mjesto je obavezno.';
      return false;
    }
    
    if (!competition) {
      this.errorMessage = 'Natjecanje je obavezno.';
      return false;
    }
    
    return true;
  }

  validateRefereeAssignments(): boolean {
    // Check for at least 2 sudci
    const validSudci = this.selectedReferees.sudci.filter(s => s.userId).length;
    if (validSudci < 2) {
      this.errorMessage = 'Potrebno je odabrati najmanje 2 suca.';
      return false;
    }

    // Check for at least 2 pomoćni sudci
    const validPomocni = this.selectedReferees.pomocniSudci.filter(s => s.userId).length;
    if (validPomocni < 2) {
      this.errorMessage = 'Potrebno je odabrati najmanje 2 pomoćna suca.';
      return false;
    }

    // Check for duplicate assignments
    const allSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId).filter(id => id),
      this.selectedReferees.delegat,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId).filter(id => id)
    ].filter(id => id);

    const uniqueIds = new Set(allSelectedIds);
    if (allSelectedIds.length !== uniqueIds.size) {
      this.errorMessage = 'Isti sudac ne može biti dodijeljen više puta.';
      return false;
    }

    return true;
  }

  // Referee management methods
  addSudac() {
    if (this.selectedReferees.sudci.length < 3) {
      const nextPosition = this.selectedReferees.sudci.length + 1;
      this.selectedReferees.sudci.push({ userId: '', position: nextPosition });
    }
  }

  removeSudac(index: number) {
    if (this.selectedReferees.sudci.length > 2) {
      this.selectedReferees.sudci.splice(index, 1);
      // Reorder positions
      this.selectedReferees.sudci.forEach((sudac, i) => {
        sudac.position = i + 1;
      });
    }
  }

  addPomocniSudac() {
    if (this.selectedReferees.pomocniSudci.length < 3) {
      const nextPosition = this.selectedReferees.pomocniSudci.length + 1;
      this.selectedReferees.pomocniSudci.push({ userId: '', position: nextPosition });
    }
  }

  removePomocniSudac(index: number) {
    if (this.selectedReferees.pomocniSudci.length > 2) {
      this.selectedReferees.pomocniSudci.splice(index, 1);
      // Reorder positions
      this.selectedReferees.pomocniSudci.forEach((sudac, i) => {
        sudac.position = i + 1;
      });
    }
  }

  // Get available referees (excluding already selected ones AND those with absences)
  getAvailableSudci(currentIndex: number): User[] {
    console.log('Getting available sudci for edit modal, date:', this.gameForm.date);
    console.log('Total absences loaded:', this.allAbsences.length);
    
    const selectedIds = this.selectedReferees.sudci
      .map((s, index) => index !== currentIndex ? s.userId : null)
      .filter(id => id);
    
    const otherSelectedIds = [
      this.selectedReferees.delegat,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId)
    ].filter(id => id);

    const allExcludedIds = [...selectedIds, ...otherSelectedIds];
    
    const availableRefs = this.availableReferees.sudci.filter(ref => {
      const notSelected = !allExcludedIds.includes(ref._id);
      const isAvailable = this.isRefereeAvailable(ref, this.gameForm.date);
      
      console.log(`Edit - Sudac ${ref.name} ${ref.surname} (${ref.personalCode}): selected=${!notSelected}, available=${isAvailable}`);
      
      return notSelected && isAvailable;
    });
    
    console.log(`Edit - Available sudci: ${availableRefs.length} out of ${this.availableReferees.sudci.length}`);
    return availableRefs;
  }

  getAvailableDelegati(): User[] {
    console.log('Getting available delegati for edit modal, date:', this.gameForm.date);
    
    const allSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      ...this.selectedReferees.pomocniSudci.map(s => s.userId)
    ].filter(id => id);

    const availableRefs = this.availableReferees.delegati.filter(ref => {
      const notSelected = !allSelectedIds.includes(ref._id);
      const isAvailable = this.isRefereeAvailable(ref, this.gameForm.date);
      
      console.log(`Edit - Delegat ${ref.name} ${ref.surname} (${ref.personalCode}): selected=${!notSelected}, available=${isAvailable}`);
      
      return notSelected && isAvailable;
    });
    
    console.log(`Edit - Available delegati: ${availableRefs.length} out of ${this.availableReferees.delegati.length}`);
    return availableRefs;
  }

  getAvailablePomocniSudci(currentIndex: number): User[] {
    console.log('Getting available pomoćni sudci for edit modal, date:', this.gameForm.date);
    
    const selectedIds = this.selectedReferees.pomocniSudci
      .map((s, index) => index !== currentIndex ? s.userId : null)
      .filter(id => id);
    
    const otherSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId),
      this.selectedReferees.delegat
    ].filter(id => id);

    const allExcludedIds = [...selectedIds, ...otherSelectedIds];
    
    const availableRefs = this.availableReferees.pomocniSudci.filter(ref => {
      const notSelected = !allExcludedIds.includes(ref._id);
      const isAvailable = this.isRefereeAvailable(ref, this.gameForm.date);
      
      console.log(`Edit - Pomoćni sudac ${ref.name} ${ref.surname} (${ref.personalCode}): selected=${!notSelected}, available=${isAvailable}`);
      
      return notSelected && isAvailable;
    });
    
    console.log(`Edit - Available pomoćni sudci: ${availableRefs.length} out of ${this.availableReferees.pomocniSudci.length}`);
    return availableRefs;
  }

  // Get newly assigned referees for notification tracking
  getNewlyAssignedReferees(): string[] {
    if (!this.game) return [];

    const currentUserIds = new Set(this.game.refereeAssignments.map(a => a.userId._id));
    const newUserIds = [
      ...this.selectedReferees.sudci.map(s => s.userId).filter(id => id),
      this.selectedReferees.delegat,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId).filter(id => id)
    ].filter(id => id);

    const newlyAssigned = newUserIds.filter(userId => !currentUserIds.has(userId));
    
    // Get referee names for display
    const newRefereeNames: string[] = [];
    
    newlyAssigned.forEach(userId => {
      const referee = [
        ...this.availableReferees.sudci,
        ...this.availableReferees.delegati,
        ...this.availableReferees.pomocniSudci
      ].find(ref => ref._id === userId);
      
      if (referee) {
        newRefereeNames.push(`${referee.name} ${referee.surname}`);
      }
    });

    return newRefereeNames;
  }

  // Form submission
  async updateGame() {
    if (!this.validateRefereeAssignments() || !this.game) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Update the game basic information
      const gameData = {
        homeTeam: this.gameForm.homeTeam.trim(),
        awayTeam: this.gameForm.awayTeam.trim(),
        date: this.gameForm.date,
        time: this.gameForm.time,
        venue: this.gameForm.venue.trim(),
        competition: this.gameForm.competition,
        status: this.gameForm.status,
        notes: this.gameForm.notes.trim()
      };

      const updatedGame = await this.basketballGameService.updateGame(this.game._id, gameData).toPromise();
      
      if (!updatedGame) {
        throw new Error('Failed to update game');
      }

      // Handle referee assignments and get notification info
      const assignmentResult = await this.updateRefereeAssignments();

      // Create success message with notification info
      let successMessage = 'Utakmica je uspješno ažurirana!';
      
      if (assignmentResult && assignmentResult.newAssignments > 0) {
        successMessage += ` ${assignmentResult.newAssignments} nova nominacija poslana!`;
      }

      // Emit success with enhanced message
      this.gameUpdated.emit({
        ...updatedGame,
        message: successMessage
      });
      this.closeModal();

    } catch (error) {
      console.error('Error updating game:', error);
      this.errorMessage = 'Greška pri ažuriranju utakmice. Molimo pokušajte ponovo.';
    } finally {
      this.isLoading = false;
    }
  }

  private async updateRefereeAssignments() {
    if (!this.game) return;

    // Get current assignments
    const currentAssignments = this.game.refereeAssignments;
    
    // Build new assignments list with all selected referees
    const newAssignments: RefereeAssignmentData[] = [];

    // Add sudci
    this.selectedReferees.sudci.forEach(sudac => {
      if (sudac.userId) {
        newAssignments.push({
          _id: sudac._id,
          userId: sudac.userId,
          role: 'Sudac',
          position: sudac.position
        });
      }
    });

    // Add delegat
    if (this.selectedReferees.delegat) {
      const existingDelegat = currentAssignments.find(a => a.role === 'Delegat');
      newAssignments.push({
        _id: existingDelegat?._id,
        userId: this.selectedReferees.delegat,
        role: 'Delegat',
        position: 1
      });
    }

    // Add pomoćni sudci
    this.selectedReferees.pomocniSudci.forEach(pomocni => {
      if (pomocni.userId) {
        newAssignments.push({
          _id: pomocni._id,
          userId: pomocni.userId,
          role: 'Pomoćni Sudac',
          position: pomocni.position
        });
      }
    });

    // Track new assignments for notifications
    const currentUserIds = new Set(currentAssignments.map(a => a.userId._id));
    const newUserIds = newAssignments.map(a => a.userId);
    const newlyAssignedUsers = newUserIds.filter(userId => !currentUserIds.has(userId));

    console.log('👥 Current referees:', currentUserIds);
    console.log('👥 New assignment user IDs:', newUserIds);
    console.log('🆕 Newly assigned users:', newlyAssignedUsers);

    // Strategy: Remove ALL current assignments and add new ones
    // Step 1: Remove all current assignments
    for (const currentAssignment of currentAssignments) {
      try {
        await this.basketballGameService.removeRefereeAssignment(this.game._id, currentAssignment._id).toPromise();
      } catch (error) {
        console.warn('Error removing assignment:', error);
        // Continue with other removals even if one fails
      }
    }

    // Step 2: Add all new assignments and track newly assigned users
    const actuallyNewUsers: string[] = [];
    
    for (const newAssignment of newAssignments) {
      try {
        await this.basketballGameService.assignReferee(this.game._id, {
          userId: newAssignment.userId,
          role: newAssignment.role,
          position: newAssignment.position
        }).toPromise();

        // Track if this is a newly assigned user
        if (newlyAssignedUsers.includes(newAssignment.userId)) {
          actuallyNewUsers.push(newAssignment.userId);
        }
      } catch (error) {
        console.error('Error adding assignment:', error);
        throw error;
      }
    }

    // Send notifications to newly assigned users
    if (actuallyNewUsers.length > 0) {
      console.log(`📧 Sending notifications to ${actuallyNewUsers.length} newly assigned referees`);
      // The notifications will be sent automatically by the backend when assignReferee is called
    }

    return {
      totalAssignments: newAssignments.length,
      newAssignments: actuallyNewUsers.length
    };
  }

  // Modal management
  closeModal() {
    this.close.emit();
    this.resetForm();
  }

  resetForm() {
    this.gameForm = {
      homeTeam: '',
      awayTeam: '',
      date: '',
      time: '',
      venue: '',
      competition: '',
      notes: '',
      status: 'Scheduled'
    };

    this.selectedReferees = {
      sudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ],
      delegat: '',
      pomocniSudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ]
    };

    this.currentStep = 1;
    this.errorMessage = '';
    this.allAbsences = [];
  }

  // Get minimum date (for editing, we allow past dates since the game might have already happened)
  getMinDate(): string {
    return '';
  }
}