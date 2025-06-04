import { Routes } from '@angular/router';
import { AuthComponent } from './components/auth/auth.component';
import { HomeComponent } from './components/home/home.component';
import { GamesAssignedComponent } from './components/games-assigned/games-assigned.component';
import { TimeAbsentComponent } from './components/time-absent/time-absent.component';
import { ExpensesComponent } from './components/expenses/expenses.component';
import { BasketRulesComponent } from './components/basket-rules/basket-rules.component';

export const routes: Routes = [
{path: 'login', component: AuthComponent},
{path: '', redirectTo:'/login', pathMatch:'full'},
{path: 'home', component: HomeComponent},
{path: 'assigned', component: GamesAssignedComponent},
{path: 'absence', component: TimeAbsentComponent},
{path: 'expenses', component: ExpensesComponent},
{path: 'rules', component: BasketRulesComponent}
];
