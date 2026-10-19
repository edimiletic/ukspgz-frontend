import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { AdminGuard } from './guards/admin.guard';
import { AuthGuard } from './guards/auth.guard';
import { EligibleOfficialsGuard } from './guards/eligible-officials.guard';
import { StatisticsGuard } from './guards/statistics.guard';

export const routes: Routes = [
  { path: 'login', component: AuthComponent, title: 'Prijava' },
  {
    path: 'set-password',
    title: 'Nova lozinka',
    loadComponent: () =>
      import('./components/set-password/set-password.component').then((m) => m.SetPasswordComponent)
  },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        title: 'Početna',
        loadComponent: () =>
          import('./components/home/home.component').then((m) => m.HomeComponent)
      },
      {
        path: 'assigned',
        title: 'Utakmice',
        loadComponent: () =>
          import('./components/games-assigned/games-assigned.component').then((m) => m.GamesAssignedComponent)
      },
      {
        path: 'absence',
        title: 'Odsustvo',
        loadComponent: () =>
          import('./components/time-absent/time-absent.component').then((m) => m.TimeAbsentComponent)
      },
      {
        path: 'expenses',
        title: 'Putni nalozi',
        loadComponent: () =>
          import('./components/expenses/expenses.component').then((m) => m.ExpensesComponent)
      },
      {
        path: 'expenses/:id',
        title: 'Putni nalog',
        loadComponent: () =>
          import('./components/expense-report-details/expense-report-details.component').then(
            (m) => m.ExpenseReportDetailsComponent
          )
      },
      {
        path: 'documents',
        title: 'Dokumenti',
        loadComponent: () =>
          import('./components/basket-rules/basket-rules.component').then((m) => m.BasketRulesComponent)
      },
      {
        path: 'exams',
        title: 'Ispiti',
        loadComponent: () =>
          import('./components/exams/exams.component').then((m) => m.ExamsComponent)
      },
      {
        path: 'exams/take/:id',
        title: 'Ispit',
        loadComponent: () =>
          import('./components/take-exam/take-exam.component').then((m) => m.TakeExamComponent),
        data: { hideSidebar: true }
      },
      {
        path: 'exams/result/:id',
        title: 'Rezultat ispita',
        loadComponent: () =>
          import('./components/exam-result/exam-result.component').then((m) => m.ExamResultComponent),
        data: { hideSidebar: true }
      },
      { path: 'exams/result', redirectTo: 'exams', pathMatch: 'full' },
      {
        path: 'exams/review/:id',
        title: 'Pregled ispita',
        loadComponent: () =>
          import('./components/exam-review/exam-review.component').then((m) => m.ExamReviewComponent),
        data: { hideSidebar: true }
      },
      {
        path: 'statistics',
        title: 'Statistika',
        loadComponent: () =>
          import('./components/statistics/statistics.component').then((m) => m.StatisticsComponent),
        canActivate: [StatisticsGuard]
      },
      {
        path: 'eligible-officials',
        title: 'Osobe za nominaciju',
        loadComponent: () =>
          import('./components/eligible-officials/eligible-officials.component').then(
            (m) => m.EligibleOfficialsComponent
          ),
        canActivate: [EligibleOfficialsGuard]
      },
      {
        path: 'users',
        title: 'Korisnici',
        loadComponent: () =>
          import('./components/users/users.component').then((m) => m.UsersComponent),
        canActivate: [AdminGuard]
      },
      {
        path: 'notifications',
        title: 'Obavijesti',
        loadComponent: () =>
          import('./components/notifications/notifications.component').then((m) => m.NotificationsComponent)
      },
      {
        path: '**',
        title: 'Stranica nije pronađena',
        loadComponent: () =>
          import('./components/not-found/not-found.component').then((m) => m.NotFoundComponent)
      }
    ]
  }
];
