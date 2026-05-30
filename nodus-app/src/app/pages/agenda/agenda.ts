import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';
import { SessoesDia } from '../../components/sessoes-dia/sessoes-dia';
import { AddSectionPaciente } from '../../components/add-section-paciente/add-section-paciente';

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

  readonly selected = signal<Date | null>(null);

  readonly diasComSessao = computed(() => {
    const set = new Set<string>();
    for (const s of this.sessaoService.sessoes()) {
      set.add(s.data.slice(0, 10));
    }
    return set;
  });

  readonly dateClass: MatCalendarCellClassFunction<Date> = (date: Date) => {
    const key = this.toDateKey(date);
    return this.diasComSessao().has(key) ? 'dia-com-sessao' : '';
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
    if (!date) return;

    const key = this.toDateKey(date);
    if (!this.diasComSessao().has(key)) return;

    const pacientes = this.pacienteService.pacientes();
    const sessoesDoDia = this.sessaoService.sessoes()
      .filter(s => s.data.slice(0, 10) === key)
      .sort((a, b) => (a.horario ?? '').localeCompare(b.horario ?? ''))
      .map(s => ({
        ...s,
        nomePaciente: pacientes.find(p => p.id_paciente === s.id_paciente)?.nome ?? 'Paciente',
      }));

    this.dialog.open(SessoesDia, {
      data: { data: date, sessoes: sessoesDoDia },
      width: 'auto',
      maxWidth: '95vw',
      panelClass: 'bottom-modal',
      position: { bottom: '0' },
    });
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
