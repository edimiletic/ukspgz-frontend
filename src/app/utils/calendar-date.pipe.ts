import { Pipe, PipeTransform } from '@angular/core';
import { formatCalendarDate } from './calendar-date';

@Pipe({
  name: 'calendarDate',
  standalone: true
})
export class CalendarDatePipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return formatCalendarDate(value);
  }
}
