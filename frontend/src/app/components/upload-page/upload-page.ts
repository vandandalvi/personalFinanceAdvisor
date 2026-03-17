import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FinanceService } from '../../services/finance';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-upload-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './upload-page.html',
  styleUrl: './upload-page.css',
})
export class UploadPage implements OnInit {
  file: File | null = null;
  uploading: boolean = false;
  dragOver: boolean = false;
  selectedBank: string = '';
  detectedBank: string | null = null;
  fileStructure: any = null;
  uploadTimer: number = 0;
  private timerInterval: any;

  @ViewChild('fileInput') fileInput!: ElementRef;

  constructor(private router: Router, private financeService: FinanceService) {
    const navState = this.router.getCurrentNavigation()?.extras.state;
    if (navState?.['demoFile']) {
      this.handleDemoFile(navState['demoFile'], navState['bankType']);
    }
  }

  ngOnInit(): void {}

  handleDemoFile(demoFile: File, bankType: string): void {
    this.handleFileSelect(demoFile);
    if (bankType) {
      this.selectedBank = bankType;
    }
  }

  startTimer(): void {
    if (this.uploading) {
      this.timerInterval = setInterval(() => {
        this.uploadTimer++;
      }, 1000);
    } else {
      clearInterval(this.timerInterval);
      this.uploadTimer = 0;
    }
  }

  detectBankFromCSV(file: File): Promise<{ bank: string | null; headers: string }> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const text = e.target.result;
        const firstLine = text.split('\n')[0].toLowerCase();

        if (firstLine.includes('txn date') && firstLine.includes('value date') && firstLine.includes('ref no./cheque no.')) {
          resolve({ bank: 'sbi', headers: firstLine });
        } else if (firstLine.includes('tran date') && firstLine.includes('chq/ref number') && firstLine.includes('withdrawal amt') && firstLine.includes('deposit amt')) {
          resolve({ bank: 'axis', headers: firstLine });
        } else if (firstLine.includes('date') && firstLine.includes('particulars') && !firstLine.includes('tran date') && !firstLine.includes('txn date')) {
          resolve({ bank: 'kotak', headers: firstLine });
        } else {
          resolve({ bank: null, headers: firstLine });
        }
      };
      reader.readAsText(file);
    });
  }

  async handleFileSelect(selectedFile: File): Promise<void> {
    if (!selectedFile) return;

    const isCsv = selectedFile.type === 'text/csv' || selectedFile.name.toLowerCase().endsWith('.csv');
    const isPdf = selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf');

    if (!isCsv && !isPdf) {
      alert("Please upload a valid .csv or .pdf file.");
      return;
    }

    this.file = selectedFile;
    this.detectedBank = null;
    this.fileStructure = null;

    if (isCsv) {
      const detection = await this.detectBankFromCSV(selectedFile);
      this.fileStructure = detection;
      this.detectedBank = detection.bank;

      if (detection.bank) {
        this.selectedBank = detection.bank;
      }
    } else if (isPdf) {
      this.selectedBank = 'kotak';
      this.detectedBank = 'kotak';
    }
  }

  onFileChange(event: any): void {
    const files = event.target.files;
    if (files.length > 0) {
      this.handleFileSelect(files[0]);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.pdf')) {
        this.handleFileSelect(droppedFile);
      }
    }
  }

  selectBank(bank: string): void {
    this.selectedBank = bank;
  }

  validateBankSelection(): { valid: boolean; message?: string; critical?: boolean; warning?: boolean } {
    if (!this.file || !this.selectedBank) {
      return { valid: false, message: 'Please select both a file and your bank.' };
    }

    if (this.detectedBank && this.detectedBank !== this.selectedBank) {
      const bankNames: any = { sbi: 'State Bank of India (SBI)', kotak: 'Kotak Mahindra Bank', axis: 'Axis Bank' };
      return {
        valid: false,
        message: `❌ CSV Format Mismatch!\n\nYour CSV file structure matches: ${bankNames[this.detectedBank]}\nBut you selected: ${bankNames[this.selectedBank]}\n\nThis will cause parsing errors and incorrect data.\n\nPlease select the correct bank: ${bankNames[this.detectedBank]}`,
        critical: true
      };
    }

    if (!this.detectedBank && this.file.name.toLowerCase().endsWith('.csv')) {
      return {
        valid: false,
        message: '⚠️ Warning: Could not automatically detect bank format from CSV structure.\n\nPlease ensure you have selected the correct bank, or the upload may fail.\n\nDo you want to continue?',
        warning: true
      };
    }

    return { valid: true };
  }

  async handleUpload(): Promise<void> {
    const validation = this.validateBankSelection();

    if (!validation.valid) {
      if (validation.critical) {
        alert(validation.message);
        return;
      } else if (validation.warning) {
        const confirmed = window.confirm(validation.message);
        if (!confirmed) return;
      } else {
        alert(validation.message);
        return;
      }
    }

    this.uploading = true;
    this.startTimer();

    this.financeService.uploadFile(this.file!, this.selectedBank).subscribe({
      next: (response: any) => {
        console.log('Upload success:', response);
        sessionStorage.removeItem('aiInsights');
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 500);
      },
      error: (error: any) => {
        console.error('Upload error:', error);
        let errorMessage = 'Upload failed. ' + (error.message || 'Please try again.');
        alert(errorMessage);
        this.uploading = false;
        this.startTimer(); // stop timer
      },
      complete: () => {
        this.uploading = false;
        this.startTimer();
      }
    });
  }
}
