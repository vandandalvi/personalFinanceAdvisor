import { Component, ElementRef, OnInit, ViewChild, AfterViewChecked } from '@angular/core';
import { Router } from '@angular/router';
import { FinanceService } from '../../services/finance';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-page.html',
  styleUrl: './chat-page.css',
})
export class ChatPage implements OnInit, AfterViewChecked {
  messages: any[] = [
    {
      type: 'bot',
      content: "Hello! I'm your AI finance assistant. I can help you understand your spending patterns, find savings opportunities, and answer questions about your transactions. What would you like to know?",
      timestamp: new Date()
    }
  ];
  inputValue: string = '';
  isLoading: boolean = false;
  
  quickQuestions: string[] = [
    "Where can I save money?",
    "What did I spend the most on?",
    "Show my spending by category",
    "Which merchants cost me the most?",
    "How much did I spend this month?"
  ];

  @ViewChild('messagesEndRef') private messagesEndRef!: ElementRef;

  constructor(private router: Router, private financeService: FinanceService) {}

  ngOnInit(): void {}

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  scrollToBottom(): void {
    try {
      this.messagesEndRef.nativeElement.scrollIntoView({ behavior: 'smooth' });
    } catch(err) { }
  }

  sendMessage(): void {
    if (!this.inputValue.trim() || this.isLoading) return;

    const userMessage = {
      type: 'user',
      content: this.inputValue,
      timestamp: new Date()
    };

    this.messages.push(userMessage);
    const query = this.inputValue;
    this.inputValue = '';
    this.isLoading = true;

    this.financeService.getChatResponse(query).subscribe({
      next: (response: any) => {
        const botMessage = {
          type: 'bot',
          content: response.response,
          timestamp: new Date()
        };
        this.messages.push(botMessage);
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Chat error:', error);
        const errorMessage = {
          type: 'bot',
          content: 'Sorry, I encountered an error. Please try again or upload your CSV data first.',
          timestamp: new Date()
        };
        this.messages.push(errorMessage);
        this.isLoading = false;
      }
    });
  }

  handleKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  askQuickQuestion(question: string): void {
    this.inputValue = question;
    this.sendMessage();
  }

  navigate(path: string): void {
    this.router.navigate([path]);
  }
}

