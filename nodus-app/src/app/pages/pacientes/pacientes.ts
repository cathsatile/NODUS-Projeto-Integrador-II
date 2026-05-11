import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-pacientes',
  imports: [DatePipe],
  templateUrl: './pacientes.html',
  styleUrl: './pacientes.scss',
})
export class Pacientes {
  numPacientes = 3;
  iniciaisPaciente = 'CM';
  sessoesPaciente = 3;
  nomePaciente = 'Carlos Mendes';
  dataSessao = new Date();
  horaSessao = '13:40';
}
