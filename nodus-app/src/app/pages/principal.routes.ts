import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { HomePage } from "./home-page/home-page";
import { Pacientes } from "./pacientes/pacientes";
import { Agenda } from "./agenda/agenda";
import { InfoPaciente } from "./info-paciente/info-paciente";
import { Sections } from "./sections/sections";
import { PsicologoProfile } from "./psicologo-profile/psicologo-profile";

const routes: Routes = [
    {path: 'home', component: HomePage},
    {path: 'pacientes', component: Pacientes},
    {path: 'info-paciente', component: InfoPaciente},
    {path: 'agenda', component: Agenda},
    {path: 'sections', component: Sections},
    {path: 'psicologo-profile', component: PsicologoProfile},

    {path: '**', redirectTo: 'home'}

];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})

export class PrincipalRoutes{}