import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService, CriarPsicologoDto } from '../../core/auth/auth.service';

function senhasIguaisValidator(form: AbstractControl): ValidationErrors | null {
  const senha = form.get('senha')?.value as string;
  const confirmar = form.get('confirmar_senha')?.value as string;
  return senha === confirmar ? null : { senhaDiferente: true };
}

interface CadastroFormValue {
  nome: string;
  email: string;
  registro_profissional: string;
  telefone: string;
  senha: string;
  confirmar_senha: string;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  tipoBotao: '' | 'login' | 'cadastro' = '';

  readonly loading = signal(false);
  readonly erro = signal('');

  loginForm: FormGroup;
  cadastroForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
    });

    this.cadastroForm = this.fb.group(
      {
        nome: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        registro_profissional: ['', Validators.required],
        telefone: [''],
        senha: ['', [Validators.required, Validators.minLength(6)]],
        confirmar_senha: ['', Validators.required],
      },
      { validators: senhasIguaisValidator }
    );
  }

  fazerLogin(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erro.set('');

    const { email, senha } = this.loginForm.value as { email: string; senha: string };
    this.authService.login(email, senha).subscribe({
      next: () => this.router.navigate(['/principal/home']),
      error: (err: HttpErrorResponse) => {
        this.erro.set(
          err.status === 401
            ? 'Email ou senha incorretos.'
            : 'Erro ao fazer login. Tente novamente.'
        );
        this.loading.set(false);
      },
    });
  }

  fazerCadastro(): void {
    if (this.cadastroForm.invalid) {
      this.cadastroForm.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.erro.set('');

    const formVal = this.cadastroForm.value as CadastroFormValue;
    const data: CriarPsicologoDto = {
      nome: formVal.nome,
      email: formVal.email,
      senha: formVal.senha,
      registro_profissional: formVal.registro_profissional,
      ...(formVal.telefone ? { telefone: formVal.telefone } : {}),
    };

    this.authService.register(data).subscribe({
      next: () => this.router.navigate(['/principal/home']),
      error: (err: HttpErrorResponse) => {
        this.erro.set(
          err.status === 409
            ? 'Este email já está cadastrado.'
            : 'Erro ao criar conta. Tente novamente.'
        );
        this.loading.set(false);
      },
    });
  }

  irParaLogin(): void {
    this.tipoBotao = 'login';
    this.erro.set('');
  }

  irParaCadastro(): void {
    this.tipoBotao = 'cadastro';
    this.erro.set('');
  }

  voltarBotoes(): void {
    this.tipoBotao = '';
    this.erro.set('');
  }
}
