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
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  data: any = null;
  aiSuggestions: string = '';
  loading: boolean = true;

  categoryData!: ChartData<'pie'>;
  monthlyData!: ChartData<'line'>;
  topMerchantsData!: ChartData<'bar'>;
  
  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
  };

  constructor(private router: Router, private financeService: FinanceService) {}

  ngOnInit(): void {
    this.fetchDashboardData();
    this.fetchAiSuggestions();
  }

  fetchDashboardData(): void {
    this.financeService.getDashboardData().subscribe({
      next: (response: any) => {
        this.data = response;
        this.prepareChartData();
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Dashboard data error:', error);
        setTimeout(() => {
          alert('No transaction data found. Please upload your CSV file first.');
          this.router.navigate(['/']);
        }, 1000);
        this.loading = false;
      }
    });
  }

  fetchAiSuggestions(): void {
    const cachedInsights = sessionStorage.getItem('aiInsights');
    if (cachedInsights) {
      this.aiSuggestions = cachedInsights;
      return;
    }

    this.financeService.getChatResponse('Give me 3 quick insights about my spending patterns and top saving opportunities').subscribe({
      next: (response: any) => {
        this.aiSuggestions = response.response;
        sessionStorage.setItem('aiInsights', response.response);
      },
      error: (error: any) => {
        console.error('AI suggestions error:', error);
        this.aiSuggestions = 'Unable to generate AI insights at the moment.';
      }
    });
  }

  prepareChartData(): void {
    if (!this.data) return;

    this.categoryData = {
      labels: this.data.categories?.map((c: any) => c.category) || [],
      datasets: [{
        label: 'Spending by Category (₹)',
        data: this.data.categories?.map((c: any) => Math.abs(c.total)) || [],
        backgroundColor: [
          '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
          '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6B7280'
        ],
        borderWidth: 0
      }]
    };

    this.monthlyData = {
      labels: this.data.monthly?.map((m: any) => m.month) || [],
      datasets: [{
        label: 'Monthly Spending (₹)',
        data: this.data.monthly?.map((m: any) => Math.abs(m.total)) || [],
        backgroundColor: '#3B82F6',
        borderColor: '#1D4ED8',
        borderWidth: 2,
        fill: false,
        tension: 0.4
      }]
    };

    this.topMerchantsData = {
      labels: this.data.topMerchants?.map((m: any) => m.merchant) || [],
      datasets: [{
        label: 'Top Merchants (₹)',
        data: this.data.topMerchants?.map((m: any) => Math.abs(m.total)) || [],
        backgroundColor: '#10B981',
        borderRadius: 8
      }]
    };
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}
