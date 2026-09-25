import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CreateGameRequest, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TimeSelectComponent } from '../time-select/time-select.component';
import { VenueSearchComponent } from '../venue-search/venue-search.component';
import { AbsenceService } from '../../../services/absence.service';
import { Absence } from '../../../model/absence.model';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';
import { CatalogTeam, CatalogVenue } from '../../../model/catalog.model';
import { firstValueFrom } from 'rxjs';
import { canNominateAssistants, canNominateOfficials, getCalendarCompetitions, isBlockingScheduleConflict, isTopProfessionalCompetition, isWithinNominationCap, timesOverlap, userHasRole } from '../../../model/roles';


@Component({
  selector: 'app-create-game-modal',
  imports: [CommonModule, FormsModule, TimeSelectComponent, VenueSearchComponent],
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

  teams: CatalogTeam[] = [];
  venues: CatalogVenue[] = [];

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
  private gamesOnSelectedDate: Array<{
    _id: string;
    time: string;
    competition: string;
    refereeAssignments?: Array<{ userId: any; assignmentStatus: string }>;
  }> = [];
  private loadedScheduleDate = '';

  constructor(
    private basketballGameService: BasketballGameService,
    private userService: UserService,
    private absenceService: AbsenceService,
    private authService: AuthService,
    private catalogService: CatalogService
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
    this.loadCatalog();
    if (this.isOpen) {
      this.loadReferees();
    }
  }

  loadCatalog() {
    this.catalogService.getTeams().subscribe({
      next: (teams) => { this.teams = teams || []; },
      error: () => { this.teams = []; }
    });
    this.catalogService.getVenues().subscribe({
      next: (venues) => { this.venues = venues || []; },
      error: () => { this.venues = []; }
    });
  }

  get teamOptions(): string[] {
    if (!this.gameForm.competition) return [];
    return this.teams
      .filter((team) => team.competitions.includes(this.gameForm.competition))
      .map((team) => team.name)
      .sort((a, b) => a.localeCompare(b, 'hr'));
  }

  get hasTeamCatalog(): boolean {
    return this.teamOptions.length > 0;
  }

  get awayTeamOptions(): string[] {
    return this.teamOptions.filter((name) => name !== this.gameForm.homeTeam);
  }

  get venueOptions(): string[] {
    return this.venues.map((venue) => venue.name).sort((a, b) => a.localeCompare(b, 'hr'));
  }

  onCompetitionChange() {
    if (this.gameForm.homeTeam && !this.teamOptions.includes(this.gameForm.homeTeam)) {
      this.gameForm.homeTeam = '';
    }
    if (this.gameForm.awayTeam && !this.teamOptions.includes(this.gameForm.awayTeam)) {
      this.gameForm.awayTeam = '';
    }
    this.updateAvailableReferees();
    this.clearUnavailableSelections();
  }

 async ngOnChanges() {
  if (this.isOpen && this.currentStep === 1) {
    this.loadCatalog();
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
  await this.refreshAvailability();
}

private async refreshAvailability() {
  if (!this.gameForm.date || !this.gameForm.time) {
    this.availableDelegati = this.eligibleOfficials(this.availableReferees.delegati);
    for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
      this.availableSudciForIndex[i] = this.eligibleOfficials(this.availableReferees.sudci);
    }
    for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
      this.availablePomocniSudciForIndex[i] = this.availableReferees.pomocniSudci;
    }
    this.unavailableCounts = { sudci: 0, delegati: 0, pomocniSudci: 0, kontrolori: 0 };
    return;
  }

  await this.loadScheduleForDate();
  this.updateAvailableReferees();
}

  loadAbsences() {
    this.isLoadingAbsences = true;
    this.absenceService.getAllAbsences().subscribe({
      next: (absences) => {
        this.allAbsences = absences || [];
        this.isLoadingAbsences = false;
        if (this.isOpen && this.gameForm.date && this.gameForm.time) {
          this.refreshAvailability();
        }
      },
      error: (error) => {
        console.error('Error loading absences:', error);
        this.allAbsences = [];
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
  addSudac() {
  if (this.selectedReferees.sudci.length < 3) {
    const nextPosition = this.selectedReferees.sudci.length + 1;
    this.selectedReferees.sudci.push({ userId: '', position: nextPosition });
    this.updateAvailableReferees();
  }
}

  removeSudac(index: number) {
  if (this.selectedReferees.sudci.length > 2) {
    this.selectedReferees.sudci.splice(index, 1);
    this.selectedReferees.sudci.forEach((sudac, i) => {
      sudac.position = i + 1;
    });
    this.updateAvailableReferees();
  }
}

  addPomocniSudac() {
  if (this.selectedReferees.pomocniSudci.length < 3) {
    const nextPosition = this.selectedReferees.pomocniSudci.length + 1;
    this.selectedReferees.pomocniSudci.push({ userId: '', position: nextPosition });
    this.updateAvailableReferees();
  }
}

  removePomocniSudac(index: number) {
  if (this.selectedReferees.pomocniSudci.length > 2) {
    this.selectedReferees.pomocniSudci.splice(index, 1);
    this.selectedReferees.pomocniSudci.forEach((sudac, i) => {
      sudac.position = i + 1;
    });
    this.updateAvailableReferees();
  }
}

private assignmentUserId(assignment: { userId: any }): string {
  if (!assignment?.userId) return '';
  return typeof assignment.userId === 'object' ? assignment.userId._id : String(assignment.userId);
}

private async loadScheduleForDate(): Promise<void> {
  if (!this.gameForm.date) {
    this.gamesOnSelectedDate = [];
    this.loadedScheduleDate = '';
    return;
  }
  if (this.loadedScheduleDate === this.gameForm.date) {
    return;
  }
  try {
    this.gamesOnSelectedDate = await firstValueFrom(
      this.basketballGameService.getGamesOnDate(this.gameForm.date)
    ) || [];
  } catch (error) {
    console.error('Error loading games for date:', error);
    this.gamesOnSelectedDate = [];
  }
  this.loadedScheduleDate = this.gameForm.date;
}

private isRefereeAvailable(referee: User): boolean {
  if (!this.gameForm.date || !this.gameForm.time) {
    return true;
  }

  const selectedGameDate = new Date(this.gameForm.date);
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

  return !this.gamesOnSelectedDate.some(game => {
    if (!timesOverlap(game.time, this.gameForm.time)) {
      return false;
    }
    if (!isBlockingScheduleConflict(game.competition, this.gameForm.competition)) {
      return false;
    }
    return (game.refereeAssignments || []).some(assignment => {
      if (!['Accepted', 'Pending'].includes(assignment.assignmentStatus)) {
        return false;
      }
      return this.assignmentUserId(assignment) === referee._id;
    });
  });
}

getAvailableSudci(currentIndex: number): User[] {
  const excludedIds = [
    ...this.selectedReferees.sudci.map((s, index) => index !== currentIndex ? s.userId : null),
    this.selectedReferees.delegat,
    this.selectedReferees.kontrolor,
    ...this.selectedReferees.pomocniSudci.map(s => s.userId)
  ].filter((id): id is string => !!id);

  return this.eligibleOfficials(this.availableReferees.sudci).filter(ref =>
    !excludedIds.includes(ref._id) && this.isRefereeAvailable(ref)
  );
}

getAvailableDelegati(): User[] {
  const excludedIds = [
    ...this.selectedReferees.sudci.map(s => s.userId),
    this.selectedReferees.kontrolor,
    ...this.selectedReferees.pomocniSudci.map(s => s.userId)
  ].filter((id): id is string => !!id);

  return this.eligibleOfficials(this.availableReferees.delegati).filter(ref =>
    !excludedIds.includes(ref._id) && this.isRefereeAvailable(ref)
  );
}

getAvailablePomocniSudci(currentIndex: number): User[] {
  const excludedIds = [
    ...this.selectedReferees.pomocniSudci.map((s, index) => index !== currentIndex ? s.userId : null),
    ...this.selectedReferees.sudci.map(s => s.userId),
    this.selectedReferees.delegat,
    this.selectedReferees.kontrolor
  ].filter((id): id is string => !!id);

  return this.availableReferees.pomocniSudci.filter(ref =>
    !excludedIds.includes(ref._id) && this.isRefereeAvailable(ref)
  );
}

getUnavailableRefereesCount(role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): number {
  if (!this.gameForm.date || !this.gameForm.time) return 0;

  const pool =
    role === 'Sudac'
      ? this.eligibleOfficials(this.availableReferees.sudci)
      : role === 'Delegat'
        ? this.eligibleOfficials(this.availableReferees.delegati)
        : this.availableReferees.pomocniSudci;

  return pool.filter(ref => !this.isRefereeAvailable(ref)).length;
}

  // Check if date change should clear selected referees who are now unavailable
  onDateChange() {
    if (!this.gameForm.date) return;
    this.clearUnavailableSelections();
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

    let message = assignments.length
      ? `Utakmica kreirana i ${assignments.length} nominacija poslano!`
      : 'Utakmica je uspješno kreirana';
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
    this.gamesOnSelectedDate = [];
    this.loadedScheduleDate = '';
  }

  // Get minimum date (today)
  getMinDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

async onDateTimeChange() {
  if (!this.gameForm.date || !this.gameForm.time) return;
  await this.refreshAvailability();
  this.clearUnavailableSelections();
}

private updateAvailableReferees() {
  if (!this.gameForm.date || !this.gameForm.time) {
    this.availableDelegati = this.eligibleOfficials(this.availableReferees.delegati);
    for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
      this.availableSudciForIndex[i] = this.eligibleOfficials(this.availableReferees.sudci);
    }
    for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
      this.availablePomocniSudciForIndex[i] = this.availableReferees.pomocniSudci;
    }
    this.unavailableCounts = { sudci: 0, delegati: 0, pomocniSudci: 0, kontrolori: 0 };
    return;
  }

  for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
    this.availableSudciForIndex[i] = this.getAvailableSudci(i);
  }
  this.availableDelegati = this.getAvailableDelegati();
  for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
    this.availablePomocniSudciForIndex[i] = this.getAvailablePomocniSudci(i);
  }

  this.unavailableCounts = {
    sudci: this.getUnavailableRefereesCount('Sudac'),
    delegati: this.getUnavailableRefereesCount('Delegat'),
    pomocniSudci: this.getUnavailableRefereesCount('Pomoćni Sudac'),
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
onRefereeSelectionChange() {
  this.updateAvailableReferees();
}

}