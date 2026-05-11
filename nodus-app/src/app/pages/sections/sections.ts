import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-sections',
  imports: [DatePipe],
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
