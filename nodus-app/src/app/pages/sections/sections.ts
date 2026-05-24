import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';
import { Sessao } from '../../core/services/sessao.model';

const PAGE_SIZE = 10;

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

  // Listas completas
  private readonly todas = this.sessaoService.sessoes;
  private readonly realizadasLista = computed(() =>
    this.sessaoService.sessoes().filter(s => new Date(s.data) < this.agora)
  );
  private readonly agendadasLista = computed(() =>
    this.sessaoService.sessoes().filter(s => new Date(s.data) >= this.agora)
  );

  // Limites de paginação independentes por aba
  readonly limiteAll = signal(PAGE_SIZE);
  readonly limiteDone = signal(PAGE_SIZE);
  readonly limiteScheduled = signal(PAGE_SIZE);

  // Slices visíveis
  readonly todasVisiveis = computed(() => this.todas().slice(0, this.limiteAll()));
  readonly realizadasVisiveis = computed(() => this.realizadasLista().slice(0, this.limiteDone()));
  readonly agendadasVisiveis = computed(() => this.agendadasLista().slice(0, this.limiteScheduled()));

  // Contadores para labels das abas
  readonly totalTodas = computed(() => this.todas().length);
  readonly totalRealizadas = computed(() => this.realizadasLista().length);
  readonly totalAgendadas = computed(() => this.agendadasLista().length);

  // Controle de "Ver mais"
  readonly temMaisAll = computed(() => this.todas().length > this.limiteAll());
  readonly temMaisDone = computed(() => this.realizadasLista().length > this.limiteDone());
  readonly temMaisScheduled = computed(() => this.agendadasLista().length > this.limiteScheduled());

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
    this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  verMais(aba: 'all' | 'done' | 'scheduled'): void {
    if (aba === 'all') this.limiteAll.update(l => l + PAGE_SIZE);
    if (aba === 'done') this.limiteDone.update(l => l + PAGE_SIZE);
    if (aba === 'scheduled') this.limiteScheduled.update(l => l + PAGE_SIZE);
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
