import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CreateGameRequest, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbsenceService } from '../../../services/absence.service';
import { Absence } from '../../../model/absence.model';
import { AuthService } from '../../../services/login.service';
import { canNominateAssistants, canNominateOfficials, getCalendarCompetitions, isBlockingScheduleConflict, isTopProfessionalCompetition, isWithinNominationCap, timesOverlap, userHasRole } from '../../../model/roles';


@Component({
  selector: 'app-create-game-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './create-game-modal.component.html',
  styleUrl: './create-game-modal.component.scss'
})
export class CreateGameModalComponent {
 @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() gameCreated = new EventEmitter<any>();

  // Form data
  gameForm: GameFormData = {
    homeTeam: '',
    awayTeam: '',
    date: '',
    time: '',
    venue: '',
    competition: '',
    notes: ''
  };

  // Referee data
  availableReferees: {
    sudci: User[];
    delegati: User[];
    pomocniSudci: User[];
    kontrolori: User[];
  } = {
    sudci: [],
    delegati: [],
    pomocniSudci: [],
    kontrolori: []
  };

  unavailableCounts = {
  sudci: 0,
  delegati: 0,
  pomocniSudci: 0,
  kontrolori: 0
};

  selectedReferees: RefereeSelection = {
    sudci: [
      { userId: '', position: 1 },
      { userId: '', position: 2 }
    ],
    delegat: '',
    kontrolor: '',
    pomocniSudci: [
      { userId: '', position: 1 },
      { userId: '', position: 2 }
    ]
  };

  get competitions(): string[] {
    return getCalendarCompetitions(this.authService.currentUserValue);
  }

  // State management
  isLoading = false;
  isLoadingReferees = false;
  isLoadingAbsences = false;
  errorMessage = '';
  currentStep = 1; // 1: Game details, 2: Referee assignments

// Add these properties to store async availability results
availableSudciForIndex: { [key: number]: User[] } = {};
availableDelegati: User[] = []; // ← Make sure this exists
availablePomocniSudciForIndex: { [key: number]: User[] } = {}; // ← Make sure this exists

  // Absence data for availability checking
  allAbsences: Absence[] = [];

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService,
    private absenceService: AbsenceService,
    private authService: AuthService
  ) {}

  canNominateOfficials(): boolean {
    return canNominateOfficials(this.authService.currentUserValue, this.gameForm.competition);
  }

  canNominateAssistants(): boolean {
    return canNominateAssistants(this.authService.currentUserValue, this.gameForm.competition);
  }

  shouldShowNominations(): boolean {
    return this.canNominateOfficials() || this.canNominateAssistants();
  }

  showKontrolorField(): boolean {
    return this.canNominateOfficials() && isTopProfessionalCompetition(this.gameForm.competition);
  }

  eligibleOfficials(refs: User[]): User[] {
    return refs.filter((ref) => isWithinNominationCap(ref, this.gameForm.competition));
  }

  get eligibleKontrolori(): User[] {
    return this.eligibleOfficials(this.availableReferees.kontrolori);
  }

  ngOnInit() {
    if (this.isOpen) {
      this.loadReferees();
    }
  }

 async ngOnChanges() {
  if (this.isOpen && this.currentStep === 1) {
    this.loadReferees();
    this.loadAbsences();
    this.resetForm();
  }
  
  // Initialize availability arrays when opening modal
  if (this.isOpen && this.currentStep === 2) {
    await this.initializeAvailabilityArrays();
  }
}

// Add this method to initialize all availability arrays
private async initializeAvailabilityArrays() {
  if (!this.gameForm.date || !this.gameForm.time) {
    // If no date/time, show all referees
    this.availableDelegati = this.eligibleOfficials(this.availableReferees.delegati);
    
    // Initialize sudci arrays
    for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
      this.availableSudciForIndex[i] = this.eligibleOfficials(this.availableReferees.sudci);
    }
    
    // Initialize pomoćni sudci arrays
    for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
      this.availablePomocniSudciForIndex[i] = this.availableReferees.pomocniSudci;
    }
    return;
  }

  // Update with actual availability checking
  await this.updateAvailableReferees();
}

  loadAbsences() {
    this.isLoadingAbsences = true;
    this.absenceService.getAllAbsences().subscribe({
      next: (absences) => {
        this.allAbsences = absences;
        this.isLoadingAbsences = false;
        console.log('Loaded absences:', absences.length);
        console.log('Sample absence:', absences[0]); // Debug: check absence structure
      },
      error: (error) => {
        console.error('Error loading absences:', error);
        this.allAbsences = []; // Continue without absence checking
        this.isLoadingAbsences = false;
      }
    });
  }

  loadReferees() {
    this.isLoadingReferees = true;
    this.userService.getReferees().subscribe({
      next: (referees) => {
        this.availableReferees = {
          sudci: referees.filter(ref => userHasRole(ref, 'Sudac')),
          delegati: referees.filter(ref => userHasRole(ref, 'Delegat')),
          pomocniSudci: referees.filter(ref => userHasRole(ref, 'Pomoćni Sudac')),
          kontrolori: referees.filter(ref => userHasRole(ref, 'Kontrolor'))
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

  // Step navigation
async nextStep() {
  if (this.validateGameForm()) {
    if (!this.shouldShowNominations()) {
      await this.createGame();
      return;
    }
    this.currentStep = 2;
    this.errorMessage = '';
    
    // Initialize availability arrays when entering step 2
    await this.initializeAvailabilityArrays();
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
    
    // Check if date is in the future
    const gameDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (gameDate < today) {
      this.errorMessage = 'Datum utakmice ne može biti u prošlosti.';
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
    if (!this.shouldShowNominations()) {
      return true;
    }

    if (this.canNominateOfficials()) {
      const validSudci = this.selectedReferees.sudci.filter(s => s.userId).length;
      if (validSudci < 2) {
        this.errorMessage = 'Potrebno je odabrati najmanje 2 suca.';
        return false;
      }
    }

    if (this.canNominateAssistants()) {
      const validPomocni = this.selectedReferees.pomocniSudci.filter(s => s.userId).length;
      if (validPomocni < 2) {
        this.errorMessage = 'Potrebno je odabrati najmanje 2 pomoćna suca.';
        return false;
      }
    }

    const allSelectedIds = [
      ...this.selectedReferees.sudci.map(s => s.userId).filter(id => id),
      this.selectedReferees.delegat,
      this.selectedReferees.kontrolor,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId).filter(id => id)
    ].filter(id => id);

    const uniqueIds = new Set(allSelectedIds);
    if (allSelectedIds.length !== uniqueIds.size) {
      this.errorMessage = 'Isti sudac ne može biti dodijeljen više puta.';
      return false;
    }

    return true;
  }

  // Referee management
async addSudac() {
  if (this.selectedReferees.sudci.length < 3) {
    const nextPosition = this.selectedReferees.sudci.length + 1;
    this.selectedReferees.sudci.push({ userId: '', position: nextPosition });
    
    // Update availability for the new position
    if (this.gameForm.date && this.gameForm.time) {
      const newIndex = this.selectedReferees.sudci.length - 1;
      this.availableSudciForIndex[newIndex] = await this.getAvailableSudci(newIndex);
    } else {
      // If no date/time, show all available sudci
      const newIndex = this.selectedReferees.sudci.length - 1;
      this.availableSudciForIndex[newIndex] = this.eligibleOfficials(this.availableReferees.sudci);
    }
  }
}

async removeSudac(index: number) {
  if (this.selectedReferees.sudci.length > 2) {
    // Remove the referee at the specified index
    this.selectedReferees.sudci.splice(index, 1);
    
    // Reorder positions
    this.selectedReferees.sudci.forEach((sudac, i) => {
      sudac.position = i + 1;
    });

    // Clear and rebuild all availability arrays
    this.availableSudciForIndex = {};
    await this.updateAvailableReferees();
  }
}

async addPomocniSudac() {
  if (this.selectedReferees.pomocniSudci.length < 3) {
    const nextPosition = this.selectedReferees.pomocniSudci.length + 1;
    this.selectedReferees.pomocniSudci.push({ userId: '', position: nextPosition });
    
    // Update availability for the new position
    if (this.gameForm.date && this.gameForm.time) {
      const newIndex = this.selectedReferees.pomocniSudci.length - 1;
      this.availablePomocniSudciForIndex[newIndex] = await this.getAvailablePomocniSudci(newIndex);
    }
  }
}

async removePomocniSudac(index: number) {
  if (this.selectedReferees.pomocniSudci.length > 2) {
    // Remove the referee at the specified index
    this.selectedReferees.pomocniSudci.splice(index, 1);
    
    // Reorder positions
    this.selectedReferees.pomocniSudci.forEach((sudac, i) => {
      sudac.position = i + 1;
    });

    // Clear and rebuild all availability arrays
    this.availablePomocniSudciForIndex = {};
    await this.updateAvailableReferees();
  }
}

  // Check if a referee is available on the game date
 // Check if a referee is available on the game date (considering both absences and scheduling conflicts)
private async isRefereeAvailable(referee: User, gameDate: string, gameTime: string): Promise<boolean> {
  if (!gameDate || !gameTime) {
    return true; // If no date/time selected, assume available
  }

  // Check absence conflicts (existing logic)
  const selectedGameDate = new Date(gameDate);
  selectedGameDate.setHours(0, 0, 0, 0);

  const hasAbsenceConflict = this.allAbsences.some(absence => {
    if (absence.userPersonalCode !== referee.personalCode) {
      return false;
    }

    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return selectedGameDate >= startDate && selectedGameDate <= endDate;
  });

  if (hasAbsenceConflict) {
    return false;
  }

  // Check scheduling conflicts with other games
 try {
    const hasSchedulingConflict = await this.checkSchedulingConflict(referee._id, gameDate, gameTime);
    return !hasSchedulingConflict;
  } catch (error) {
    console.error('Error checking scheduling conflicts:', error);
    return true;
  }
}

// Check if referee has scheduling conflicts with existing games
// Check if referee has scheduling conflicts with existing games
private async checkSchedulingConflict(refereeId: string, gameDate: string, gameTime: string): Promise<boolean> {
  try {
    const existingGames = await this.basketballGameService.getGamesByRefereeAndDate(refereeId, gameDate).toPromise();
    
    if (!existingGames || existingGames.length === 0) {
      return false;
    }

    for (const game of existingGames) {
      if (!timesOverlap(game.time, gameTime)) {
        continue;
      }
      if (isBlockingScheduleConflict(game.competition, this.gameForm.competition)) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking scheduling conflicts:', error);
    return false;
  }
}

  // Get available referees (excluding already selected ones, those with absences, AND those with scheduling conflicts)
async getAvailableSudci(currentIndex: number): Promise<User[]> {
  const sudci = this.eligibleOfficials(this.availableReferees.sudci);
  if (!this.gameForm.date || !this.gameForm.time) {
    return sudci;
  }

  const selectedIds = this.selectedReferees.sudci
    .map((s, index) => index !== currentIndex ? s.userId : null)
    .filter(id => id);
  
  const otherSelectedIds = [
    this.selectedReferees.delegat,
    ...this.selectedReferees.pomocniSudci.map(s => s.userId)
  ].filter(id => id);

  const allExcludedIds = [...selectedIds, ...otherSelectedIds];
  
  const availableRefs: User[] = [];
  
  for (const ref of sudci) {
    const notSelected = !allExcludedIds.includes(ref._id);
    if (notSelected) {
      const isAvailable = await this.isRefereeAvailable(ref, this.gameForm.date, this.gameForm.time);
      if (isAvailable) {
        availableRefs.push(ref);
      }
    }
  }
  
  return availableRefs;
}

async getAvailableDelegati(): Promise<User[]> {
  const delegati = this.eligibleOfficials(this.availableReferees.delegati);
  if (!this.gameForm.date || !this.gameForm.time) {
    return delegati;
  }

  const allSelectedIds = [
    ...this.selectedReferees.sudci.map(s => s.userId),
    ...this.selectedReferees.pomocniSudci.map(s => s.userId)
  ].filter(id => id);

  const availableRefs: User[] = [];
  
  for (const ref of delegati) {
    const notSelected = !allSelectedIds.includes(ref._id);
    if (notSelected) {
      const isAvailable = await this.isRefereeAvailable(ref, this.gameForm.date, this.gameForm.time);
      if (isAvailable) {
        availableRefs.push(ref);
      }
    }
  }
  
  return availableRefs;
}

async getAvailablePomocniSudci(currentIndex: number): Promise<User[]> {
  const pomocni = this.availableReferees.pomocniSudci;
  if (!this.gameForm.date || !this.gameForm.time) {
    return pomocni;
  }

  const selectedIds = this.selectedReferees.pomocniSudci
    .map((s, index) => index !== currentIndex ? s.userId : null)
    .filter(id => id);
  
  const otherSelectedIds = [
    ...this.selectedReferees.sudci.map(s => s.userId),
    this.selectedReferees.delegat
  ].filter(id => id);

  const allExcludedIds = [...selectedIds, ...otherSelectedIds];
  
  const availableRefs: User[] = [];
  
  for (const ref of pomocni) {
    const notSelected = !allExcludedIds.includes(ref._id);
    if (notSelected) {
      const isAvailable = await this.isRefereeAvailable(ref, this.gameForm.date, this.gameForm.time);
      if (isAvailable) {
        availableRefs.push(ref);
      }
    }
  }
  
  return availableRefs;
}

  // Get count of unavailable referees for display (updated to include scheduling conflicts)
async getUnavailableRefereesCount(role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): Promise<number> {
  if (!this.gameForm.date || !this.gameForm.time) return 0;

  let totalReferees = 0;
  let availableReferees = 0;

  switch (role) {
    case 'Sudac':
      totalReferees = this.availableReferees.sudci.length;
      // Count available referees considering both absences and scheduling conflicts
      for (const ref of this.availableReferees.sudci) {
        const isAvailable = await this.isRefereeAvailable(ref, this.gameForm.date, this.gameForm.time);
        if (isAvailable) {
          availableReferees++;
        }
      }
      break;
      
    case 'Delegat':
      totalReferees = this.availableReferees.delegati.length;
      for (const ref of this.availableReferees.delegati) {
        const isAvailable = await this.isRefereeAvailable(ref, this.gameForm.date, this.gameForm.time);
        if (isAvailable) {
          availableReferees++;
        }
      }
      break;
      
    case 'Pomoćni Sudac':
      totalReferees = this.availableReferees.pomocniSudci.length;
      for (const ref of this.availableReferees.pomocniSudci) {
        const isAvailable = await this.isRefereeAvailable(ref, this.gameForm.date, this.gameForm.time);
        if (isAvailable) {
          availableReferees++;
        }
      }
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
        if (referee && !this.isRefereeAvailable(referee, this.gameForm.date, this.gameForm.time)) {
          this.selectedReferees.sudci[index].userId = '';
        }
      }
    });

    if (this.selectedReferees.delegat) {
      const delegat = this.availableReferees.delegati.find(ref => ref._id === this.selectedReferees.delegat);
      if (delegat && !this.isRefereeAvailable(delegat, this.gameForm.date, this.gameForm.time)) {
        this.selectedReferees.delegat = '';
      }
    }

    this.selectedReferees.pomocniSudci.forEach((pomocni, index) => {
      if (pomocni.userId) {
        const referee = this.availableReferees.pomocniSudci.find(ref => ref._id === pomocni.userId);
        if (referee && !this.isRefereeAvailable(referee, this.gameForm.date, this.gameForm.time)) {
          this.selectedReferees.pomocniSudci[index].userId = '';
        }
      }
    });
  }
// In create-game-modal.component.ts
async createGame() {
  if (!this.validateRefereeAssignments()) {
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  try {
    // Create the game
    const gameData: CreateGameRequest = {
      homeTeam: this.gameForm.homeTeam.trim(),
      awayTeam: this.gameForm.awayTeam.trim(),
      date: this.gameForm.date,
      time: this.gameForm.time,
      venue: this.gameForm.venue.trim(),
      competition: this.gameForm.competition,
      notes: this.gameForm.notes.trim()
    };

    const createdGame = await this.basketballGameService.createGame(gameData).toPromise();
    
    if (!createdGame) {
      throw new Error('Failed to create game');
    }

    // Assign referees
    const assignments: RefereeAssignmentData[] = [];

    // Add sudci
    this.selectedReferees.sudci.forEach(sudac => {
      if (sudac.userId) {
        assignments.push({
          userId: sudac.userId,
          role: 'Sudac',
          position: sudac.position
        });
      }
    });

    // Add delegat
    if (this.selectedReferees.delegat) {
      assignments.push({
        userId: this.selectedReferees.delegat,
        role: 'Delegat',
        position: 1
      });
    }

    if (this.selectedReferees.kontrolor && this.showKontrolorField()) {
      assignments.push({
        userId: this.selectedReferees.kontrolor,
        role: 'Kontrolor',
        position: 1
      });
    }

    // Add pomoćni sudci
    this.selectedReferees.pomocniSudci.forEach(pomocni => {
      if (pomocni.userId) {
        assignments.push({
          userId: pomocni.userId,
          role: 'Pomoćni Sudac',
          position: pomocni.position
        });
      }
    });

    const releasedNominations: Array<{ homeTeam: string; awayTeam: string; competition: string }> = [];
    for (const assignment of assignments) {
      const result: any = await this.basketballGameService.assignReferee(createdGame._id, assignment).toPromise();
      if (result?.releasedNominations?.length) {
        releasedNominations.push(...result.releasedNominations);
      }
    }

    let message = `Utakmica kreirana i ${assignments.length} nominacija poslano!`;
    if (releasedNominations.length) {
      const released = releasedNominations
        .map(item => `${item.homeTeam} vs ${item.awayTeam} (${item.competition})`)
        .join(', ');
      message += ` Niže nominacije su puštene i trebaju novu osobu: ${released}.`;
    }

    this.gameCreated.emit({
      ...createdGame,
      message
    });
    this.closeModal();

  } catch (error: any) {
    console.error('Error creating game:', error);
    this.errorMessage = error?.error?.error || 'Greška pri kreiranju utakmice. Molimo pokušajte ponovo.';
  } finally {
    this.isLoading = false;
  }
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
      notes: ''
    };

    this.selectedReferees = {
      sudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ],
      delegat: '',
      kontrolor: '',
      pomocniSudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ]
    };

    this.currentStep = 1;
    this.errorMessage = '';
  }

  // Get minimum date (today)
  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

async onDateTimeChange() {
  if (!this.gameForm.date || !this.gameForm.time) return;

  // Update available referees for all positions
  await this.updateAvailableReferees();
  
  // Clear selections for referees who are no longer available
  this.clearUnavailableSelections();
}

private async updateAvailableReferees() {
  if (!this.gameForm.date || !this.gameForm.time) {
    await this.initializeAvailabilityArrays();
    return;
  }

  // Clear existing arrays to avoid stale data
  this.availableSudciForIndex = {};
  this.availablePomocniSudciForIndex = {};

  // Update sudci availability for ALL current positions
  for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
    this.availableSudciForIndex[i] = await this.getAvailableSudci(i);
  }
  
  // Update delegati availability
  this.availableDelegati = await this.getAvailableDelegati();
  
  // Update pomoćni sudci availability for ALL current positions
  for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
    this.availablePomocniSudciForIndex[i] = await this.getAvailablePomocniSudci(i);
  }

  // Update unavailable counts
  this.unavailableCounts = {
    sudci: await this.getUnavailableRefereesCount('Sudac'),
    delegati: await this.getUnavailableRefereesCount('Delegat'),
    pomocniSudci: await this.getUnavailableRefereesCount('Pomoćni Sudac'),
    kontrolori: 0
  };
}
private clearUnavailableSelections() {
  // Clear sudci selections if referee is no longer available
  this.selectedReferees.sudci.forEach((sudac, index) => {
    if (sudac.userId) {
      const isStillAvailable = this.availableSudciForIndex[index]?.some(ref => ref._id === sudac.userId);
      if (!isStillAvailable) {
        this.selectedReferees.sudci[index].userId = '';
      }
    }
  });

  // Clear delegat selection if no longer available
  if (this.selectedReferees.delegat) {
    const isStillAvailable = this.availableDelegati.some(ref => ref._id === this.selectedReferees.delegat);
    if (!isStillAvailable) {
      this.selectedReferees.delegat = '';
    }
  }

  // Clear pomoćni sudci selections if referee is no longer available
  this.selectedReferees.pomocniSudci.forEach((pomocni, index) => {
    if (pomocni.userId) {
      const isStillAvailable = this.availablePomocniSudciForIndex[index]?.some(ref => ref._id === pomocni.userId);
      if (!isStillAvailable) {
        this.selectedReferees.pomocniSudci[index].userId = '';
      }
    }
  });
}

// Method to handle referee selection changes
async onRefereeSelectionChange() {
  // Small delay to ensure ngModel has updated
  setTimeout(async () => {
    await this.updateAvailableReferees();
  }, 0);
}

}