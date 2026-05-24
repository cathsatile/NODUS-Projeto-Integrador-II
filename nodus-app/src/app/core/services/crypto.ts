import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {

  encrypt(data: string, chave: string): string {
    return CryptoJS.AES.encrypt(data, chave).toString();
  }

  // Retorna o texto original se não conseguir decifrar (dados ainda não criptografados)
  decrypt(ciphertext: string, chave: string): string {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, chave);
      const resultado = bytes.toString(CryptoJS.enc.Utf8);
      return resultado || ciphertext;
    } catch {
      return ciphertext;
    }
  }
}
