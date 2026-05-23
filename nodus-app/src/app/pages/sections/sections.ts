import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-sections',
  imports: [DatePipe, MatTabsModule],
  templateUrl: './sections.html',
  styleUrl: './sections.scss',
})
export class Sections {
  iniciaisPaciente = 'RO';
  nomePaciente = 'Rafael Oliveira';
  data = new Date();
  statusSessao = 'Agendada';
  todasSessoes = 3;
  numRealizadas = 6;
  numAgendadas = 5;
  numCanceladas = 1;

}
