import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-games-assigned',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './games-assigned.component.html',
  styleUrl: './games-assigned.component.scss'
})
export class GamesAssignedComponent {

}
