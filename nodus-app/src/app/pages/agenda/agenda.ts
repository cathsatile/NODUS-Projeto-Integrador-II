import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';
import { emocaoEmoji, emocaoLabel, statusLabel } from '../../core/services/emocoes';

@Component({
  selector: 'app-agenda',
  imports: [MatDatepickerModule, MatCardModule, MatNativeDateModule, MatDialogModule],
  templateUrl: './agenda.html',
  styleUrl: './agenda.scss',
})
export class Agenda implements OnInit {
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private sessaoService = inject(SessaoService);
  private dialog = inject(MatDialog);

  readonly emocaoEmoji = emocaoEmoji;
  readonly emocaoLabel = emocaoLabel;
  readonly statusLabel = statusLabel;

  private static readonly DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

  readonly selected = signal<Date | null>(null);

  readonly dataSelecionada = computed(() => {
    const d = this.selected();
    if (!d) return '';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    return `${Agenda.DIAS[d.getDay()]}, ${dia}/${mes}/${ano}`;
  });

  readonly diasComSessao = computed(() => {
    const set = new Set<string>();
    for (const s of this.sessaoService.sessoes()) {
      set.add(s.data.slice(0, 10));
    }
    return set;
  });

  readonly sessoesDia = computed(() => {
    const date = this.selected();
    if (!date) return [];
    const key = this.toDateKey(date);
    const pacientes = this.pacienteService.pacientes();
    return this.sessaoService.sessoes()
      .filter(s => s.data.slice(0, 10) === key)
      .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))
      .map(s => ({
        ...s,
        nomePaciente: pacientes.find(p => p.id_paciente === s.id_paciente)?.nome ?? 'Paciente',
      }));
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date, view: 'month' | 'year' | 'multi-year') => {
    if (view !== 'month') return '';
    return this.diasComSessao().has(this.toDateKey(date)) ? 'dia-com-sessao' : '';
  };

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (!psi) return;
    if (this.pacienteService.pacientes().length === 0) {
      this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    }
    this.sessaoService.getByPsicologo(psi.id_psicologo).subscribe();
  }

  onDateSelected(date: Date | null): void {
    this.selected.set(date);
  }

  openNovaSession(): void {
    this.dialog.open(AddSectionPaciente, {
      data: { add: 'sessao' },
      width: 'auto',
      maxWidth: '95vw',
      position: { bottom: '0' },
      panelClass: 'bottom-modal',
    });
  }

  private toDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
}
