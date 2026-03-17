import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FinanceService } from '../../services/finance';
import { CommonModule } from '@angular/common';

import {
  Chart,
  ArcElement,
  BarElement,
  BarController,
  PieController,
  LineController,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title,
  ChartData,
  ChartOptions
} from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

// Register Chart.js components
Chart.register(
  ArcElement,
  BarElement,
  BarController,
  PieController,
  LineController,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Title
);

@Component({
  selector: 'app-advanced-analytics',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './advanced-analytics.html',
  styleUrl: './advanced-analytics.css',
})
export class AdvancedAnalytics implements OnInit {
  analyticsData: any = null;
  loading: boolean = true;

  categoryTrendData!: ChartData<'bar'>;
  weekdaySpendingData!: ChartData<'bar'>;
  hourlySpendingData!: ChartData<'line'>;
  
  Math = Math; // Export Math to template

  constructor(private router: Router, private financeService: FinanceService) {}

  ngOnInit(): void {
    this.fetchAdvancedAnalytics();
  }

  fetchAdvancedAnalytics(): void {
    this.financeService.getAdvancedAnalytics().subscribe({
      next: (response: any) => {
        this.analyticsData = response;
        this.prepareChartData();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Advanced analytics error:', error);
        setTimeout(() => {
          alert('Unable to load analytics. Please upload your CSV file first.');
          this.router.navigate(['/']);
        }, 1000);
        this.loading = false;
      }
    });
  }

  prepareChartData(): void {
    if (!this.analyticsData) return;

    this.categoryTrendData = {
      labels: this.analyticsData.categoryTrends?.map((ct: any) => ct.category) || [],
      datasets: [
        {
          label: 'Average Spending (₹)',
          data: this.analyticsData.categoryTrends?.map((ct: any) => ct.avg) || [],
          backgroundColor: '#3B82F6',
        },
        {
          label: 'Median Spending (₹)',
          data: this.analyticsData.categoryTrends?.map((ct: any) => ct.median) || [],
          backgroundColor: '#10B981',
        }
      ]
    };

    this.weekdaySpendingData = {
      labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      datasets: [{
        label: 'Spending by Day of Week (₹)',
        data: this.analyticsData.weekdaySpending || [],
        backgroundColor: '#8B5CF6',
        borderRadius: 8
      }]
    };

    this.hourlySpendingData = {
      labels: Array.from({length: 24}, (_, i) => `${i}:00`),
      datasets: [{
        label: 'Spending by Hour (₹)',
        data: this.analyticsData.hourlySpending || [],
        borderColor: '#F59E0B',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4
      }]
    };
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}

