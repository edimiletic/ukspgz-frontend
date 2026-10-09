import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ALL_COMPETITIONS,
  COMMISSIONER_ROLES,
  getRoleNames,
  incompatibleRolesMessage,
  isRoleCompatibleWithSelection,
  normalizeRoleAssignments,
  REFEREE_RANKS,
  USER_ROLES,
  UserRole
} from '../../../model/roles';
import { User } from '../../../model/user.model';
import {
  buildRoleAssignments,
  commissionerHolders,
  remainingRolesAfterCommissionerTake,
  OFFICIAL_CAP_ROLES,
  toDateInputValue
} from '../users.helpers';

export interface UserFormSave {
  username: string;
  name: string;
  surname: string;
  email: string;
  password?: string;
  birthdate: string;
  personalCode: string;
  address: string;
  roles: { name: UserRole; competitions: string[] }[];
  rang: string;
  najvisaLiga: string;
}

@Component({
  selector: 'app-user-form-modal',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './user-form-modal.component.html',
  styleUrl: './user-form-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserFormModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isBusy = false;
  @Input() user: User | null = null;
  @Input() users: User[] = [];
  @Input() serverError = '';
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<UserFormSave>();

  readonly allRoles = USER_ROLES;
  readonly competitions = ALL_COMPETITIONS;
  readonly ranks = REFEREE_RANKS;
  readonly commissionerRoles = COMMISSIONER_ROLES;
  readonly officialCapRoles = OFFICIAL_CAP_ROLES;

  selectedRoles = new Set<UserRole>();
  competitionsByRole: Partial<Record<UserRole, string[]>> = {};
  formError = '';

  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    name: ['', Validators.required],
    surname: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    birthdate: ['', Validators.required],
    personalCode: ['', Validators.required],
    address: ['', Validators.required],
    rang: [''],
    najvisaLiga: ['']
  });

  get isEdit(): boolean {
    return !!this.user;
  }

  get needsOfficialCap(): boolean {
    return OFFICIAL_CAP_ROLES.some((role) => this.selectedRoles.has(role));
  }

  get needsRank(): boolean {
    return this.selectedRoles.has('Sudac');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] || changes['user']) {
      this.hydrateForm();
    }
  }

  isRoleSelected(role: UserRole): boolean {
    return this.selectedRoles.has(role);
  }

  isRoleBlocked(role: UserRole): boolean {
    return !isRoleCompatibleWithSelection(role, [...this.selectedRoles]);
  }

  toggleRole(role: UserRole): void {
    if (this.selectedRoles.has(role)) {
      this.selectedRoles.delete(role);
      delete this.competitionsByRole[role];
    } else {
      if (this.isRoleBlocked(role)) {
        this.formError = incompatibleRolesMessage([...this.selectedRoles, role]) || '';
        return;
      }
      this.formError = '';
      this.selectedRoles.add(role);
      if (COMMISSIONER_ROLES.includes(role) && !this.competitionsByRole[role]) {
        this.competitionsByRole[role] = [];
      }
    }
    this.selectedRoles = new Set(this.selectedRoles);
    this.competitionsByRole = { ...this.competitionsByRole };
  }

  hasCompetition(role: UserRole, competition: string): boolean {
    return (this.competitionsByRole[role] || []).includes(competition);
  }

  holderLabel(role: UserRole, competition: string): string {
    return this.occupancy[role]?.[competition]?.label || '';
  }

  holderNote(role: UserRole, competition: string): string {
    const holder = this.occupancy[role]?.[competition];
    if (!holder) {
      return '';
    }
    if (!this.hasCompetition(role, competition)) {
      return `sada vodi ${holder.label}`;
    }
    const remaining = remainingRolesAfterCommissionerTake(
      holder,
      role,
      this.competitionsByRole[role] || []
    );
    if (!remaining.length) {
      return `zadnje natjecanje od ${holder.label} — ostaje u sustavu, ali bi ostao/la bez uloge`;
    }
    if (!remaining.includes(role)) {
      return `preuzima se od ${holder.label} (ostaje ${remaining.join(', ')})`;
    }
    return `preuzima se od ${holder.label}`;
  }

  private blockedLastRoleHolders(): string[] {
    const names = new Set<string>();
    COMMISSIONER_ROLES.forEach((role) => {
      const taken = this.competitionsByRole[role] || [];
      taken.forEach((competition) => {
        const holder = this.occupancy[role]?.[competition];
        if (!holder) {
          return;
        }
        if (!remainingRolesAfterCommissionerTake(holder, role, taken).length) {
          names.add(holder.label);
        }
      });
    });
    return [...names];
  }

  private get occupancy() {
    return commissionerHolders(this.users, this.user?._id);
  }

  toggleCompetition(role: UserRole, competition: string): void {
    const current = new Set(this.competitionsByRole[role] || []);
    if (current.has(competition)) {
      current.delete(competition);
    } else {
      current.add(competition);
    }
    this.competitionsByRole = { ...this.competitionsByRole, [role]: [...current] };
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget && !this.isBusy) {
      this.close.emit();
    }
  }

  submit(): void {
    this.formError = '';
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.formError = this.formInvalidMessage();
      return;
    }
    if (!this.selectedRoles.size) {
      this.formError = 'Odaberite barem jednu ulogu.';
      return;
    }
    const roleConflict = incompatibleRolesMessage([...this.selectedRoles]);
    if (roleConflict) {
      this.formError = roleConflict;
      return;
    }

    const raw = this.form.getRawValue();
    if (!this.isEdit && !raw.password.trim()) {
      this.formError = 'Lozinka je obavezna za novog korisnika.';
      return;
    }
    if (raw.password.trim() && raw.password.trim().length < 8) {
      this.formError = 'Lozinka mora imati najmanje 8 znakova.';
      return;
    }

    const missingCommissionerLeagues = COMMISSIONER_ROLES.filter(
      (role) => this.selectedRoles.has(role) && !(this.competitionsByRole[role] || []).length
    );
    if (missingCommissionerLeagues.length) {
      this.formError =
        'Povjereniku odaberi barem jedno natjecanje. Sve postojeće lige već imaju povjerenika — dodijeli novo natjecanje ili preuzmi natjecanje s postojećeg povjerenika.';
      return;
    }
    const blockedHolders = this.blockedLastRoleHolders();
    if (blockedHolders.length) {
      this.formError =
        `${blockedHolders.join(', ')} ostaje u sustavu, ali ovo im je jedina uloga. ` +
        'Prvo im u Uredi dodijeli drugu ulogu ili ostavi barem jedno natjecanje, pa tek onda preuzmi ligu.';
      return;
    }
    if (this.needsRank && !raw.rang.trim()) {
      this.formError = 'Za suca obavezno odaberi rang.';
      return;
    }
    if (this.needsOfficialCap && !raw.najvisaLiga.trim()) {
      this.formError = this.needsRank
        ? 'Za suca obavezno odaberi najvišu ligu.'
        : 'Za delegata i kontrolora obavezno odaberi najvišu ligu.';
      return;
    }

    const payload: UserFormSave = {
      username: raw.username.trim(),
      name: raw.name.trim(),
      surname: raw.surname.trim(),
      email: raw.email.trim(),
      birthdate: raw.birthdate,
      personalCode: raw.personalCode.trim(),
      address: raw.address.trim(),
      roles: buildRoleAssignments([...this.selectedRoles], this.competitionsByRole),
      rang: this.needsRank ? raw.rang : '',
      najvisaLiga: this.needsOfficialCap ? raw.najvisaLiga : ''
    };
    if (raw.password.trim()) {
      payload.password = raw.password.trim();
    }
    this.save.emit(payload);
  }

  private formInvalidMessage(): string {
    const email = this.form.controls.email;
    if (email.hasError('required')) {
      return 'E-pošta je obavezna.';
    }
    if (email.hasError('email')) {
      return 'E-pošta mora biti ispravna, npr. ime.prezime@domena.hr.';
    }

    const labels: Record<string, string> = {
      username: 'korisničko ime',
      email: 'e-pošta',
      name: 'ime',
      surname: 'prezime',
      personalCode: 'osobni broj',
      birthdate: 'datum rođenja',
      address: 'adresa',
      password: 'lozinka'
    };
    const missing = Object.keys(labels).filter((key) => this.form.get(key)?.hasError('required'));
    if (missing.length) {
      return `Popuni obavezna polja: ${missing.map((key) => labels[key]).join(', ')}.`;
    }
    return 'Provjeri unesene podatke.';
  }

  private hydrateForm(): void {
    this.formError = '';
    this.selectedRoles = new Set();
    this.competitionsByRole = {};
    if (!this.user) {
      this.form.reset({
        username: '',
        name: '',
        surname: '',
        email: '',
        password: '',
        birthdate: '',
        personalCode: '',
        address: '',
        rang: '',
        najvisaLiga: ''
      });
      return;
    }

    const assignments = normalizeRoleAssignments(this.user);
    assignments.forEach((assignment) => {
      this.selectedRoles.add(assignment.name as UserRole);
      if (COMMISSIONER_ROLES.includes(assignment.name as UserRole)) {
        this.competitionsByRole[assignment.name as UserRole] = [...(assignment.competitions || [])];
      }
    });
    if (!this.selectedRoles.size) {
      getRoleNames(this.user).forEach((name) => this.selectedRoles.add(name as UserRole));
    }

    this.form.reset({
      username: this.user.username,
      name: this.user.name,
      surname: this.user.surname,
      email: this.user.email,
      password: '',
      birthdate: toDateInputValue(this.user.birthdate),
      personalCode: this.user.personalCode,
      address: this.user.address,
      rang: this.user.rang || '',
      najvisaLiga: this.user.najvisaLiga || ''
    });
  }
}
