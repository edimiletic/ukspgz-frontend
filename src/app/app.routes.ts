import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { AppShellComponent } from './components/app-shell/app-shell.component';
import { HomeComponent } from './components/home/home.component';
import { GamesAssignedComponent } from './components/games-assigned/games-assigned.component';
import { TimeAbsentComponent } from './components/time-absent/time-absent.component';
import { ExpensesComponent } from './components/expenses/expenses.component';
import { BasketRulesComponent } from './components/basket-rules/basket-rules.component';
import { AuthGuard } from './guards/auth.guard';
import { ExpenseReportDetailsComponent } from './components/expense-report-details/expense-report-details.component';
import { ExamsComponent } from './components/exams/exams.component';
import { TakeExamComponent } from './components/take-exam/take-exam.component';
import { ExamResultComponent } from './components/exam-result/exam-result.component';
import { ExamReviewComponent } from './components/exam-review/exam-review.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { NotificationsComponent } from './components/notifications/notifications.component';
import { EligibleOfficialsComponent } from './components/eligible-officials/eligible-officials.component';
import { EligibleOfficialsGuard } from './guards/eligible-officials.guard';
import { StatisticsGuard } from './guards/statistics.guard';
import { NotFoundComponent } from './components/not-found/not-found.component';

export const routes: Routes = [
  { path: 'login', component: AuthComponent },
  {
    path: '',
    component: AppShellComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'home', pathMatch: 'full' },
      { path: 'home', component: HomeComponent },
      { path: 'assigned', component: GamesAssignedComponent },
      { path: 'absence', component: TimeAbsentComponent },
      { path: 'expenses', component: ExpensesComponent },
      { path: 'expenses/:id', component: ExpenseReportDetailsComponent },
      { path: 'documents', component: BasketRulesComponent },
      { path: 'exams', component: ExamsComponent },
      { path: 'exams/take/:id', component: TakeExamComponent, data: { hideSidebar: true } },
      { path: 'exams/result/:id', component: ExamResultComponent, data: { hideSidebar: true } },
      { path: 'exams/result', redirectTo: 'exams', pathMatch: 'full' },
      { path: 'exams/review/:id', component: ExamReviewComponent, data: { hideSidebar: true } },
      { path: 'statistics', component: StatisticsComponent, canActivate: [StatisticsGuard] },
      { path: 'eligible-officials', component: EligibleOfficialsComponent, canActivate: [EligibleOfficialsGuard] },
      { path: 'notifications', component: NotificationsComponent },
      { path: '**', component: NotFoundComponent }
    ]
  }
];
