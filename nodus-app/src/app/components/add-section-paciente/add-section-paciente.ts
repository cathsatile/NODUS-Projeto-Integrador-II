import { Component, inject, OnInit, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatStepperModule } from '@angular/material/stepper';
import { AuthService } from '../../core/auth/auth.service';
import { PacienteService } from '../../core/services/paciente.service';
import { SessaoService } from '../../core/services/sessao.service';

function senhasIguaisValidator(group: AbstractControl): ValidationErrors | null {
  const senha = group.get('senha')?.value;
  const confirmar = group.get('confirmarSenha')?.value;
  return senha && confirmar && senha !== confirmar ? { senhasDiferentes: true } : null;
}

@Component({
  selector: 'app-add-section-paciente',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatStepperModule],
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

  readonly dadosPessoaisForm = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(3)]],
    telefone: [''],
    data_nascimento: ['', Validators.required],
  });

  readonly dadosAcessoForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', Validators.required],
  }, { validators: senhasIguaisValidator });

  readonly sessaoForm = this.fb.group({
    id_paciente: [null as number | null, Validators.required],
    data: ['', Validators.required],
    horario: ['', Validators.required],
    observacoes: [''],
    humor: [null as number | null],
  });

  ngOnInit(): void {
    const psi = this.authService.psicologoAtual();
    if (psi && this.pacientes().length === 0) {
      this.pacienteService.getByPsicologo(psi.id_psicologo).subscribe();
    }
  }

  salvarPaciente(): void {
    if (this.dadosPessoaisForm.invalid || this.dadosAcessoForm.invalid) return;
    const psi = this.authService.psicologoAtual();
    if (!psi) return;

    this.loading.set(true);
    this.erro.set(null);

    const { nome, data_nascimento } = this.dadosPessoaisForm.value;
    const { email, senha } = this.dadosAcessoForm.value;

    this.pacienteService.create({
      nome: nome!,
      email: email!,
      senha: senha!,
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
      humor: humor ?? undefined,
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
