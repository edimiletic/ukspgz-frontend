// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
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

export const routes: Routes = [
  {path: 'login', component: AuthComponent},
  {
    path: '',
    redirectTo: '/home', // Change this to always redirect to home
    pathMatch: 'full'
  },
  {path: 'home', component: HomeComponent, canActivate: [AuthGuard]},
  {path: 'assigned', component: GamesAssignedComponent, canActivate: [AuthGuard]},
  {path: 'absence', component: TimeAbsentComponent, canActivate: [AuthGuard]},
  {path: 'expenses', component: ExpensesComponent, canActivate: [AuthGuard]},
  {path: 'expenses/:id', component: ExpenseReportDetailsComponent, canActivate: [AuthGuard]},
  {path: 'documents', component: BasketRulesComponent, canActivate: [AuthGuard]},
  {path: 'exams', component: ExamsComponent, canActivate: [AuthGuard]},
  {path: 'exams/take/:id', component: TakeExamComponent, canActivate: [AuthGuard]},
  {path: 'exams/result', component: ExamResultComponent, canActivate: [AuthGuard]},
  {path: 'exams/review/:id', component: ExamReviewComponent, canActivate: [AuthGuard]},
  {
  path: 'statistics', 
  component: StatisticsComponent, 
  canActivate: [AuthGuard]
},
{
  path: 'notifications',
  component: NotificationsComponent,
  canActivate: [AuthGuard] // Add auth guard if you have one
}
];