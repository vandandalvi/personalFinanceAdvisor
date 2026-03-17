import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FinanceService } from '../../services/finance';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome-page.html',
  styleUrl: './welcome-page.css',
})
export class WelcomePageComponent implements OnInit {
  backendStatus: string = 'checking'; // 'checking', 'waking', 'ready'

  constructor(private router: Router, private financeService: FinanceService) {}

  ngOnInit(): void {
    this.wakeUpBackend();
  }

  wakeUpBackend(): void {
    console.log('Pinging backend to wake up...');
    this.financeService.pingBackend().subscribe({
      next: (response) => {
        console.log('Backend is awake and ready!');
        this.backendStatus = 'ready';
      },
      error: (error) => {
        console.log('Backend is waking up (this can take 30-60 seconds on free tier)');
        this.backendStatus = 'waking';
        // Retry after 10 seconds if still waking
        setTimeout(() => this.wakeUpBackend(), 10000);
      }
    });
  }

  handleGetStarted(): void {
    this.router.navigate(['/upload']);
  }

  handleTryDemo(): void {
    this.router.navigate(['/upload'], { state: { isDemo: true } });
  }

  handleViewDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
