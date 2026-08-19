# Banco de dados opcional

O gerador não precisa de banco. Use esta camada quando adicionar usuários, projetos salvos e histórico.

Recomendação: Neon Postgres, conectado pelo Marketplace da Vercel. Crie o banco, copie `DATABASE_URL` para as variáveis do projeto e execute `schema.sql` no console SQL.

Não armazene arquivos de áudio no Postgres. Guarde somente metadados e use um object storage para WAV/MP3.
