const CryptoJS = require('crypto-js');
const fs = require('fs');

// --- 1. SIMULAÇÃO DE DADOS COMPLETOS (Baseado no Modelo Conceitual) [cite: 18, 20, 22] ---
const bancoSimulado = {
  psicologo: { 
    nome: "Dr. Davi", 
    registro: "CRP-12345" 
  },
  pacientes: [
    { id: 101, nome: "Ana Souza", email: "ana@email.com", notas: "Evolução positiva em vício digital." },
    { id: 102, nome: "Carlos Lima", email: "carlos@email.com", notas: "Foco em metas de curto prazo (RF08)." },
    { id: 103, nome: "Beatriz Oliveira", email: "bea@email.com", notas: "Monitoramento de humor estável (RF12)." }
  ]
};

const MINHA_SENHA_MESTRA = "Nodus@2026";
const ARQUIVO_DESTINO = "./backup_teste.nodus";

console.log("=== 🛡️ INICIANDO PROVA DE CONCEITO NODUS ===");

// --- 2. CRIPTOGRAFIA E EXPORTAÇÃO ---
try {
    const jsonString = JSON.stringify(bancoSimulado);
    const criptografado = CryptoJS.AES.encrypt(jsonString, MINHA_SENHA_MESTRA).toString();
    
    fs.writeFileSync(ARQUIVO_DESTINO, criptografado);
    console.log("✅ Sucesso: Arquivo 'backup_teste.nodus' gerado.");
} catch (e) {
    console.error("❌ Erro na exportação:", e);
}

// --- 3. LEITURA, DESCRIPTOGRAFIA E EXIBIÇÃO DETALHADA ---
console.log("\n=== 🔑 TESTANDO RECUPERAÇÃO E INTEGRIDADE ===");
try {
    const conteudoCriptografado = fs.readFileSync(ARQUIVO_DESTINO, 'utf8');
    const bytes = CryptoJS.AES.decrypt(conteudoCriptografado, MINHA_SENHA_MESTRA);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);

    if (!originalText) throw new Error("Falha na chave.");

    const dadosRestaurados = JSON.parse(originalText);
    
    console.log("✅ Sucesso: Dados recuperados com integridade.");
    console.log(`\n👨‍⚕️ Psicólogo Responsável: ${dadosRestaurados.psicologo.nome} (${dadosRestaurados.psicologo.registro})`);
    
    console.log("\n👥 Lista de Pacientes Recuperada:");
    console.log("--------------------------------------------------");
    
    // Percorrendo a lista de pacientes para provar a eficácia da tradução [cite: 31, 37]
    dadosRestaurados.pacientes.forEach((p, index) => {
        console.log(`${index + 1}. [ID: ${p.id}] Nome: ${p.nome}`);
        console.log(`   📧 Email: ${p.email}`);
        console.log(`   📝 Notas Clínicas: ${p.notas}`);
        console.log("--------------------------------------------------");
    });

} catch (e) {
    console.error("❌ Erro na restauração: Senha inválida ou arquivo corrompido.");
}