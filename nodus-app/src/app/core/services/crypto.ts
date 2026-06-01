import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  encrypt(data: string, chave: string): string {
    return CryptoJS.AES.encrypt(data, chave).toString();
  }

  // Lança erro se o ciphertext for inválido ou a chave estiver errada.
  // Callers devem tratar o erro e exibir um estado de falha ao usuário.
  decrypt(ciphertext: string, chave: string): string {
    const bytes = CryptoJS.AES.decrypt(ciphertext, chave);
    const resultado = bytes.toString(CryptoJS.enc.Utf8);
    if (!resultado) {
      throw new Error('Falha ao decifrar: chave incorreta ou dado corrompido');
    }
    return resultado;
  }
}
