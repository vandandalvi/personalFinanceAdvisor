import { Routes } from '@angular/router';
import { WelcomePageComponent } from './components/welcome-page/welcome-page';
import { UploadPage } from './components/upload-page/upload-page';
import { Dashboard } from './components/dashboard/dashboard';
import { ChatPage } from './components/chat-page/chat-page';
import { AdvancedAnalytics } from './components/advanced-analytics/advanced-analytics';

export const routes: Routes = [
  { path: '', component: WelcomePageComponent },
  { path: 'upload', component: UploadPage },
  { path: 'dashboard', component: Dashboard },
  { path: 'chat', component: ChatPage },
  { path: 'advanced-analytics', component: AdvancedAnalytics },
  { path: '**', redirectTo: '' }
];
