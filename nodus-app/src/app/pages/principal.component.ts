import { Component } from '@angular/core';
import { Header } from '../components/header/header';
import { Navbar } from '../components/navbar/navbar';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-principal-component',
  imports: [Header, Navbar, RouterOutlet],
  templateUrl: './principal.component.html',
  styleUrl: './principal.component.scss',
})
export class Principal {}
