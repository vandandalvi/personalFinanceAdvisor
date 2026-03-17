import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class FinanceService {
  private apiBaseUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  pingBackend(): Observable<any> {
    return this.http.get(this.apiBaseUrl);
  }

  uploadFile(file: File, bankType: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank', bankType);
    return this.http.post(`${this.apiBaseUrl}/upload`, formData);
  }

  getDashboardData(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/dashboard`);
  }

  getChatResponse(message: string): Observable<any> {
    return this.http.post(`${this.apiBaseUrl}/chat`, { message });
  }

  getAdvancedAnalytics(): Observable<any> {
    return this.http.get(`${this.apiBaseUrl}/advanced-analytics`);
  }
}
