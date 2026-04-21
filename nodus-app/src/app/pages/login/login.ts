import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  tipoBotao: '' | 'login' | 'cadastro' = '';
  loginForm!: FormGroup;
  cadastroForm!: FormGroup;
  nome: any;
  senha: any;
  confirmar_senha: any;
  email: any;
  crp: any;
  telefone: any;
  mensagem_erro: any;

  //   senhasIguais(form: FormGroup) {
  //   return form.get('senha')?.value === form.get('confirmarSenha')?.value
  //     ? null
  //     : { senhaDiferente: true };
  // }

  fazerCadastro() {

    if (this.senha !== this.confirmar_senha) {
      this.mensagem_erro = 'As senhas não coincidem';
      return;
    }

    this.mensagem_erro = '';
    console.log('Formulário válido ✅');
  }

  fazerLogin() {

  }


  onInit() {
    this.tipoBotao = '';
  }

  irParaLogin() {
    this.tipoBotao = 'login';
  }

  irParaCadastro() {
    this.tipoBotao = 'cadastro';
  }
  voltarBotoes() {
    this.tipoBotao = '';
  }


}
