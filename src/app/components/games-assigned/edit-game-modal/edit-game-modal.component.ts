// src/app/components/games-assigned/edit-game-modal/edit-game-modal.component.ts
import { CommonModule } from '@angular/common';
import { BasketballGame, GameFormData, RefereeAssignmentData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { UserService } from '../../../services/user.service';
import { BasketballGameService } from './../../../services/basketballGame.service';
import { AbsenceService } from '../../../services/absence.service';
import { Absence } from '../../../model/absence.model';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';
import { CatalogTeam, CatalogVenue } from '../../../model/catalog.model';
import { firstValueFrom } from 'rxjs';
import { ALL_COMPETITIONS, canManageCalendar, canNominateAssistants, canNominateOfficials, getCalendarCompetitions, isBlockingScheduleConflict, isTopProfessionalCompetition, isWithinNominationCap, timesOverlap, userHasRole } from '../../../model/roles';
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TimeSelectComponent } from '../time-select/time-select.component';
import { VenueSearchComponent } from '../venue-search/venue-search.component';

@Component({
  selector: 'app-edit-game-modal',
  imports: [CommonModule, FormsModule, TimeSelectComponent, VenueSearchComponent],
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

  teams: CatalogTeam[] = [];
  venues: CatalogVenue[] = [];

  // Add these properties after the existing ones
  availableSudciForIndex: { [key: number]: User[] } = {};
  availableDelegati: User[] = [];
  availableKontrolori: User[] = [];
  availablePomocniSudciForIndex: { [key: number]: User[] } = {};

  unavailableCounts = {
    sudci: 0,
    delegati: 0,
    pomocniSudci: 0
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

  selectedReferees: RefereeSelection = {
    sudci: [],
    delegat: '',
    kontrolor: '',
    pomocniSudci: []
  };

  get competitions(): string[] {
    const calendarCompetitions = getCalendarCompetitions(this.authService.currentUserValue);
    if (this.gameForm.competition && !calendarCompetitions.includes(this.gameForm.competition)) {
      return [this.gameForm.competition, ...calendarCompetitions];
    }
    return calendarCompetitions.length ? calendarCompetitions : ALL_COMPETITIONS;
  }

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

  canManageCalendar(): boolean {
    return canManageCalendar(this.authService.currentUserValue, this.gameForm.competition);
  }

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

  ngOnInit() {
    this.loadCatalog();
    if (this.isOpen && this.game) {
      this.loadReferees();
      this.loadAbsences();
      this.populateForm();
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

  get catalogTeamNames(): string[] {
    if (!this.gameForm.competition) return [];
    return this.teams
      .filter((team) => team.competitions.includes(this.gameForm.competition))
      .map((team) => team.name)
      .sort((a, b) => a.localeCompare(b, 'hr'));
  }

  get hasTeamCatalog(): boolean {
    return this.catalogTeamNames.length > 0;
  }

  get teamOptions(): string[] {
    const names = [...this.catalogTeamNames];
    if (this.gameForm.homeTeam && !names.includes(this.gameForm.homeTeam)) {
      names.unshift(this.gameForm.homeTeam);
    }
    return names;
  }

  get awayTeamOptions(): string[] {
    const names = this.teamOptions.filter((name) => name !== this.gameForm.homeTeam);
    if (this.gameForm.awayTeam && !names.includes(this.gameForm.awayTeam)) {
      names.unshift(this.gameForm.awayTeam);
    }
    return names;
  }

  get venueOptions(): string[] {
    const names = this.venues.map((venue) => venue.name).sort((a, b) => a.localeCompare(b, 'hr'));
    if (this.gameForm.venue && !names.includes(this.gameForm.venue)) {
      names.unshift(this.gameForm.venue);
    }
    return names;
  }

  onCompetitionChange() {
    if (this.gameForm.homeTeam && !this.catalogTeamNames.includes(this.gameForm.homeTeam)) {
      this.gameForm.homeTeam = '';
    }
    if (this.gameForm.awayTeam && !this.catalogTeamNames.includes(this.gameForm.awayTeam)) {
      this.gameForm.awayTeam = '';
    }
    this.updateAvailableReferees();
    this.clearUnavailableSelections();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen && this.game) {
      this.loadCatalog();
      this.loadReferees();
      this.loadAbsences();
      this.populateForm();
      this.currentStep = this.canManageCalendar() || !this.shouldShowNominations() ? 1 : 2;
      this.errorMessage = '';
    }
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
        console.error('Error loading absences in edit modal:', error);
        this.allAbsences = [];
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
    let kontrolor = '';

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
        case 'Kontrolor':
          kontrolor = assignment.userId._id;
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
      kontrolor,
      pomocniSudci
    };
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
        if (this.currentStep === 2) {
          this.initializeAvailabilityArrays();
        }
      },
      error: (error) => {
        console.error('Error loading referees:', error);
        this.errorMessage = 'Greška pri učitavanju sudaca.';
        this.isLoadingReferees = false;
      }
    });
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
      if (this.game && String(game._id) === String(this.game._id)) {
        return false;
      }
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

  onDateChange() {
    if (!this.gameForm.date) return;
    this.clearUnavailableSelections();
  }

  // Update the nextStep method to initialize arrays
  async nextStep() {
    if (this.validateGameForm()) {
      if (!this.shouldShowNominations()) {
        await this.updateGame();
        return;
      }
      this.currentStep = 2;
      this.errorMessage = '';
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

  // Referee management methods
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

  // Get newly assigned referees for notification tracking
  getNewlyAssignedReferees(): string[] {
    if (!this.game) return [];

    const currentUserIds = new Set(this.game.refereeAssignments.map(a => a.userId._id));
    const newUserIds = [
      ...this.selectedReferees.sudci.map(s => s.userId).filter(id => id),
      this.selectedReferees.delegat,
      this.selectedReferees.kontrolor,
      ...this.selectedReferees.pomocniSudci.map(s => s.userId).filter(id => id)
    ].filter(id => id);

    const newlyAssigned = newUserIds.filter(userId => !currentUserIds.has(userId));
    
    // Get referee names for display
    const newRefereeNames: string[] = [];
    
    newlyAssigned.forEach(userId => {
      const referee = [
        ...this.availableReferees.sudci,
        ...this.availableReferees.delegati,
        ...this.availableReferees.pomocniSudci,
        ...this.availableReferees.kontrolori
      ].find(ref => ref._id === userId);
      
      if (referee) {
        newRefereeNames.push(`${referee.name} ${referee.surname}`);
      }
    });

    return newRefereeNames;
  }

  // Form submission
  async updateGame() {
    if ((this.shouldShowNominations() && !this.validateRefereeAssignments()) || !this.game) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      let updatedGame = this.game;

      if (this.canManageCalendar()) {
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

        updatedGame = await this.basketballGameService.updateGame(this.game._id, gameData).toPromise() || this.game;
      }

      const assignmentResult = this.shouldShowNominations()
        ? await this.updateRefereeAssignments()
        : { newAssignments: 0, releasedNominations: [] as Array<{ homeTeam: string; awayTeam: string; competition: string }> };

      let successMessage = 'Utakmica je uspješno ažurirana!';
      
      if (assignmentResult && assignmentResult.newAssignments > 0) {
        successMessage += ` ${assignmentResult.newAssignments} nova nominacija poslana!`;
      }
      if (assignmentResult && 'releasedNominations' in assignmentResult && assignmentResult.releasedNominations?.length) {
        const released = assignmentResult.releasedNominations
          .map(item => `${item.homeTeam} vs ${item.awayTeam} (${item.competition})`)
          .join(', ');
        successMessage += ` Niže nominacije su puštene i trebaju novu osobu: ${released}.`;
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

  private managedAssignmentRoles(): Array<'Sudac' | 'Delegat' | 'Pomoćni Sudac' | 'Kontrolor'> {
    const roles: Array<'Sudac' | 'Delegat' | 'Pomoćni Sudac' | 'Kontrolor'> = [];
    if (this.canNominateOfficials()) {
      roles.push('Sudac', 'Delegat', 'Kontrolor');
    }
    if (this.canNominateAssistants()) {
      roles.push('Pomoćni Sudac');
    }
    return roles;
  }

  private async updateRefereeAssignments() {
    if (!this.game) return;

    const currentAssignments = this.game.refereeAssignments;
    const managedRoles = this.managedAssignmentRoles();
    const newAssignments: RefereeAssignmentData[] = [];

    if (this.canNominateOfficials()) {
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

      if (this.selectedReferees.delegat) {
        const existingDelegat = currentAssignments.find(a => a.role === 'Delegat');
        newAssignments.push({
          _id: existingDelegat?._id,
          userId: this.selectedReferees.delegat,
          role: 'Delegat',
          position: 1
        });
      }

      if (this.selectedReferees.kontrolor && this.showKontrolorField()) {
        const existingKontrolor = currentAssignments.find(a => a.role === 'Kontrolor');
        newAssignments.push({
          _id: existingKontrolor?._id,
          userId: this.selectedReferees.kontrolor,
          role: 'Kontrolor',
          position: 1
        });
      }
    }

    if (this.canNominateAssistants()) {
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
    }

    const currentUserIds = new Set(currentAssignments.map(a => a.userId._id));
    const newUserIds = newAssignments.map(a => a.userId);
    const newlyAssignedUsers = newUserIds.filter(userId => !currentUserIds.has(userId));

    for (const currentAssignment of currentAssignments) {
      if (!managedRoles.includes(currentAssignment.role)) {
        continue;
      }
      try {
        await this.basketballGameService.removeRefereeAssignment(this.game._id, currentAssignment._id).toPromise();
      } catch (error) {
        console.warn('Error removing assignment:', error);
      }
    }

    // Step 2: Add all new assignments and track newly assigned users
    const actuallyNewUsers: string[] = [];
    const releasedNominations: Array<{ homeTeam: string; awayTeam: string; competition: string }> = [];
    
    for (const newAssignment of newAssignments) {
      try {
        const result: any = await this.basketballGameService.assignReferee(this.game._id, {
          userId: newAssignment.userId,
          role: newAssignment.role,
          position: newAssignment.position
        }).toPromise();

        if (result?.releasedNominations?.length) {
          releasedNominations.push(...result.releasedNominations);
        }

        if (newlyAssignedUsers.includes(newAssignment.userId)) {
          actuallyNewUsers.push(newAssignment.userId);
        }
      } catch (error) {
        console.error('Error adding assignment:', error);
        throw error;
      }
    }

    return {
      totalAssignments: newAssignments.length,
      newAssignments: actuallyNewUsers.length,
      releasedNominations
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
      kontrolor: '',
      pomocniSudci: [
        { userId: '', position: 1 },
        { userId: '', position: 2 }
      ]
    };

this.currentStep = 1;
   this.errorMessage = '';
   this.allAbsences = [];
   this.gamesOnSelectedDate = [];
   this.loadedScheduleDate = '';
 }

 // Get minimum date (for editing, we allow past dates since the game might have already happened)
 getMinDate(): string {
   return '';
 }

 // Add this method to initialize all availability arrays
 private async initializeAvailabilityArrays() {
   await this.refreshAvailability();
 }

 private async refreshAvailability() {
   if (!this.gameForm.date || !this.gameForm.time) {
     this.updateAvailableReferees();
     return;
   }
   await this.loadScheduleForDate();
   this.updateAvailableReferees();
 }

 private updateAvailableReferees() {
   if (!this.gameForm.date || !this.gameForm.time) {
     this.availableDelegati = this.eligibleOfficials(this.availableReferees.delegati);
     this.availableKontrolori = this.eligibleOfficials(this.availableReferees.kontrolori);
     for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
       this.availableSudciForIndex[i] = this.eligibleOfficials(this.availableReferees.sudci);
     }
     for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
       this.availablePomocniSudciForIndex[i] = this.availableReferees.pomocniSudci;
     }
     this.unavailableCounts = { sudci: 0, delegati: 0, pomocniSudci: 0 };
     return;
   }

   for (let i = 0; i < this.selectedReferees.sudci.length; i++) {
     this.availableSudciForIndex[i] = this.getAvailableSudci(i);
   }

   this.availableDelegati = this.getAvailableDelegati();
   this.availableKontrolori = this.eligibleOfficials(this.availableReferees.kontrolori).filter(ref =>
     ![
       ...this.selectedReferees.sudci.map(s => s.userId),
       this.selectedReferees.delegat,
       ...this.selectedReferees.pomocniSudci.map(s => s.userId)
     ].includes(ref._id) && this.isRefereeAvailable(ref)
   );

   for (let i = 0; i < this.selectedReferees.pomocniSudci.length; i++) {
     this.availablePomocniSudciForIndex[i] = this.getAvailablePomocniSudci(i);
   }

   this.unavailableCounts = {
     sudci: this.getUnavailableRefereesCount('Sudac'),
     delegati: this.getUnavailableRefereesCount('Delegat'),
     pomocniSudci: this.getUnavailableRefereesCount('Pomoćni Sudac')
   };
 }

 // Update the onDateTimeChange method
 async onDateTimeChange() {
   if (!this.gameForm.date || !this.gameForm.time) {
     this.unavailableCounts = { sudci: 0, delegati: 0, pomocniSudci: 0 };
     return;
   }

   await this.refreshAvailability();
   this.clearUnavailableSelections();
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

   if (this.selectedReferees.kontrolor) {
     const isStillAvailable = this.availableKontrolori.some(ref => ref._id === this.selectedReferees.kontrolor);
     if (!isStillAvailable) {
       this.selectedReferees.kontrolor = '';
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

 onRefereeSelectionChange() {
   this.updateAvailableReferees();
 }
}