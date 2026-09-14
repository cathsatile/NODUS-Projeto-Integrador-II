// Banco em memória para os testes — precisa ser definido antes de qualquer
// import de 'src/database/db' (o módulo abre a conexão no top-level).
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test_secret';
