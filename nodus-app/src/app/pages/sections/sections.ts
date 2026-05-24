import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';
import { Sessao } from '../../core/services/sessao.model';

@Component({
  selector: 'app-sections',
  imports: [DatePipe, NgTemplateOutlet, MatTabsModule, MatDialogModule],
  templateUrl: './sections.html',
  styleUrl: './sections.scss',
})
export class Sections implements OnInit {
  private authService = inject(AuthService);
  private sessaoService = inject(SessaoService);
  private pacienteService = inject(PacienteService);
  private dialog = inject(MatDialog);

  private readonly agora = new Date();

  readonly todasSessoes = this.sessaoService.sessoes;

  readonly realizadas = computed(() =>
    this.sessaoService.sessoes().filter(s => new Date(s.data) < this.agora)
  );

  readonly agendadas = computed(() =>
    this.sessaoService.sessoes().filter(s => new Date(s.data) >= this.agora)
  );

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  nomePaciente(id_paciente: number): string {
    return this.pacienteService.pacientes()
      .find(p => p.id_paciente === id_paciente)?.nome ?? 'Paciente';
  }

  iniciaisDe(nome: string): string {
    return nome
      .split(' ')
      .filter(p => p.length > 0)
      .slice(0, 2)
      .map(p => p[0].toUpperCase())
      .join('');
  }

  statusDe(sessao: Sessao): string {
    return new Date(sessao.data) >= this.agora ? 'Agendada' : 'Realizada';
  }

  openModal(): void {
    this.dialog.open(AddSectionPaciente, {
      data: { add: 'sessao' },
      width: 'auto',
      maxWidth: '95vw',
      position: { bottom: '0' },
      panelClass: 'bottom-modal',
    });
  }
}
