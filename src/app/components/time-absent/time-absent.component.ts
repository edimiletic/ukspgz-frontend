import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";

@Component({
  selector: 'app-time-absent',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './time-absent.component.html',
  styleUrl: './time-absent.component.scss'
})
export class TimeAbsentComponent {

}
