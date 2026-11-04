# Histórico de versões — Mapa das Ervas Vivas

As versões seguem o padrão SemVer: MAJOR.MINOR.PATCH.

- **MAJOR**: mudança estrutural incompatível ou grande marco de estabilidade.
- **MINOR**: nova funcionalidade ou melhoria relevante, mantendo compatibilidade.
- **PATCH**: correção de bug, ajuste pequeno ou melhoria interna.

Enquanto o projeto estiver antes da versão 1.0.0, a API e as funcionalidades ainda podem mudar. A versão atual é 0.2.1.

## [0.2.1] — 2026-11-03

**Resumo:** reduz o consumo de consultas e tráfego no carregamento do mapa e na moderação.

### Alterado
- Mapa carrega até 200 plantas aprovadas por página, com opção de carregar mais sob demanda.
- Consulta pública do mapa seleciona apenas os campos necessários.
- Confirmação de presença não força novo download de todas as plantas.
- URLs assinadas das fotos de moderação são solicitadas em lote.
- Consultas administrativas e de moderação selecionam colunas específicas; histórico das pendências fica limitado a 300 registros.

### Validação
- Código revisado e alterações registradas na branch main.
- Build: não executado neste ambiente.
- Deploy: não confirmado.
- Testes reais de navegação, paginação, moderação e fotos: pendentes.

### Commit relacionado
- `39b2db3` — otimização principal do carregamento do mapa e das consultas de moderação.

---

## [0.2.0] — 2026-11-03

**Resumo:** evolução da moderação, auditoria e administração do mapa.

### Adicionado
- Aprovação e rejeição individual de fotos.
- Status próprio para fotos: pending, approved e rejected.
- Histórico administrativo com busca, filtro por ação e visualização dos dados anteriores e posteriores.
- Lista de ocorrências da saúde do mapa, com acesso à localização para conferência.

### Segurança
- Bucket plant-photos alterado para privado.
- Leitura de fotos condicionada à aprovação ou à autorização do colaborador/moderador.
- Política de atualização de status de fotos limitada a moderadores.
- Upload continua limitado à pasta do usuário autenticado.

### Atenção
- Esta versão está registrada no código, mas ainda depende de build, deploy e testes reais de aprovação/rejeição, acesso às imagens e uso em dispositivos móveis.
- Não considerar a versão validada em produção até concluir esses testes.

### Commits relacionados
- `4b0d6ae` — moderação individual e acesso privado às fotos.
- `74d7ed0` — estilos dos controles de moderação de fotos.
- `e6664ef` — histórico pesquisável e ocorrências acionáveis do mapa.
- `25061ca` — estilos do histórico e da saúde do mapa.
- `4953847` — identificação da versão 0.2.0.

---

## Modelo para próximas versões

### [0.2.1] — AAAA-MM-DD
**Resumo:** uma frase curta explicando o objetivo da atualização.

#### Adicionado
- Novas funcionalidades.

#### Alterado
- Melhorias em funcionalidades existentes.

#### Corrigido
- Problemas resolvidos.

#### Segurança
- Alterações de permissões, autenticação ou proteção de dados.

#### Validação
- Build:
- Deploy:
- Testes realizados:
