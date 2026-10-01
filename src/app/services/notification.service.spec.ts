import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationService } from './notification.service';
import { environment } from '../../environments/environment';

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/notifications`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('dohvaća listu i broj nepročitanih', () => {
    service.getNotifications().subscribe(list => {
      expect(list.length).toBe(1);
    });
    http.expectOne(base).flush([{ _id: 'n1' }]);

    service.getUnreadCount().subscribe(res => {
      expect(res.count).toBe(3);
    });
    const unread = http.expectOne(`${base}/unread-count`);
    expect(unread.request.method).toBe('GET');
    unread.flush({ count: 3 });
  });

  it('označava pročitano pojedinačno, više i sve', () => {
    service.markAsRead('n1').subscribe();
    const one = http.expectOne(`${base}/n1/read`);
    expect(one.request.method).toBe('PATCH');
    one.flush({ _id: 'n1', isRead: true });

    service.markMultipleAsRead(['n1', 'n2']).subscribe();
    const many = http.expectOne(`${base}/mark-multiple-read`);
    expect(many.request.body).toEqual({ notificationIds: ['n1', 'n2'] });
    many.flush({ modified: 2 });

    service.markAllAsRead().subscribe();
    const all = http.expectOne(`${base}/mark-all-read`);
    expect(all.request.method).toBe('PATCH');
    all.flush({ modified: 5 });
  });

  it('paginira all i briše obavijest', () => {
    service.getAllNotifications(2, 10).subscribe(res => {
      expect(res.currentPage).toBe(2);
    });
    const page = http.expectOne(`${base}/all?page=2&limit=10`);
    expect(page.request.method).toBe('GET');
    page.flush({ notifications: [], total: 0, currentPage: 2, totalPages: 0 });

    service.deleteNotification('n1').subscribe();
    const del = http.expectOne(`${base}/n1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });
});
