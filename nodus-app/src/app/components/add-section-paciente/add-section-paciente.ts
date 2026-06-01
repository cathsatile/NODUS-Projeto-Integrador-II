import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';
import { EMOCOES } from '../../core/services/emocoes';

@Component({
  selector: 'app-add-section-paciente',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './add-section-paciente.html',
  styleUrl: './add-section-paciente.scss'
})
export class AddSectionPaciente implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private pacienteService = inject(PacienteService);
  private sessaoService = inject(SessaoService);
  private dialogRef = inject(MatDialogRef<AddSectionPaciente>);
  readonly data = inject<{ add: string }>(MAT_DIALOG_DATA);

  readonly loading = signal(false);
  readonly erro = signal<string | null>(null);
  readonly pacientes = this.pacienteService.pacientes;
  readonly EMOCOES = EMOCOES;

  readonly pacienteForm = this.fb.group({
    nome:            ['', [Validators.required, Validators.minLength(3)]],
    email:           ['', [Validators.required, Validators.email]],
    telefone:        [''],
    data_nascimento: ['', Validators.required],
  });

  readonly sessaoForm = this.fb.group({
    id_paciente: [null as number | null, Validators.required],
    data:        ['', Validators.required],
    horario:     ['', Validators.required],
    observacoes: [''],
    humor:       [null as number | null],
  });

  get sessaoNoPassado(): boolean {
    const d = this.sessaoForm.get('data')?.value;
    const h = this.sessaoForm.get('horario')?.value;
    if (!d || !h) return false;
    return new Date(`${d}T${h}:00`) <= new Date();
  }

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (psi && this.pacientes().length === 0) {
      this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    }
  }

  salvarPaciente(): void {
    if (this.pacienteForm.invalid) return;
    const psi = this.authService.psicologoAtual();
    if (!psi) return;

    this.loading.set(true);
    this.erro.set(null);

    const { nome, email, data_nascimento } = this.pacienteForm.value;

    this.pacienteService.create({
      nome: nome!,
      email: email!,
      data_nascimento: data_nascimento!,
      id_psicologo: psi.id_psicologo,
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.erro.set('Erro ao cadastrar paciente. Tente novamente.');
        this.loading.set(false);
      },
    });
  }

  salvarSessao(): void {
    if (this.sessaoForm.invalid) return;
    const psi = this.authService.psicologoAtual();
    if (!psi) return;

    this.loading.set(true);
    this.erro.set(null);

    const { id_paciente, data, horario, observacoes, humor } = this.sessaoForm.value;

    this.sessaoService.create({
      id_paciente: id_paciente!,
      data: data!,
      horario: horario!,
      observacoes: observacoes ?? undefined,
      humor: this.sessaoNoPassado ? (humor ?? undefined) : undefined,
      id_psicologo: psi.id_psicologo,
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.erro.set('Erro ao agendar sessão. Tente novamente.');
        this.loading.set(false);
      },
    });
  }
}
