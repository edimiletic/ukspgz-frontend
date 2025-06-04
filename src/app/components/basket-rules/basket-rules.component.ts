import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-basket-rules',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './basket-rules.component.html',
  styleUrl: './basket-rules.component.scss'
})
export class BasketRulesComponent {

}
