import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { RouterModule } from '@angular/router';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-basket-rules',
  imports: [HeaderComponent, FooterComponent, RouterModule, SidebarComponent],
  templateUrl: './basket-rules.component.html',
  styleUrl: './basket-rules.component.scss'
})
export class BasketRulesComponent {

}
