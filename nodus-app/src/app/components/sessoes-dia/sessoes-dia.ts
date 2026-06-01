import { DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { Sessao } from '../../core/services/sessao.model';
import { emocaoEmoji, emocaoLabel, statusLabel } from '../../core/services/emocoes';

export interface SessoesDiaData {
  data: Date;
  sessoes: Array<Sessao & { nomePaciente: string }>;
}

@Component({
  selector: 'app-sessoes-dia',
  imports: [DatePipe, MatDialogModule],
  templateUrl: './sessoes-dia.html',
  styleUrl: './sessoes-dia.scss',
})
export class SessoesDia {
  readonly dialogData = inject<SessoesDiaData>(MAT_DIALOG_DATA);
  readonly emocaoEmoji = emocaoEmoji;
  readonly emocaoLabel = emocaoLabel;
  readonly statusLabel = statusLabel;
}
