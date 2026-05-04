import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { AuthService } from "./auth.service";
import { Observable } from "rxjs";

@Injectable({
    providedIn: 'root'
})

export class LdapService{

    constructor(private http: HttpClient, private authService: AuthService){}

    // login(email: string, senha: string): Observable<any>{
        
    // }

    
}
