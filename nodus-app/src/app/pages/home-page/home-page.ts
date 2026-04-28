import { Component } from '@angular/core';

@Component({
  selector: 'app-home-page',
  imports: [],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  psiNome =  'DR. Fulano';
  sessaoHoje = 'Nenhuma sessão hoje';
  numPacientes = 3;
  numSessoesMes = 10;
}
