# Histórico de versões — Mapa das Ervas Vivas

As versões seguem o padrão SemVer: MAJOR.MINOR.PATCH.

- **MAJOR**: mudança estrutural incompatível ou grande marco de estabilidade.
- **MINOR**: nova funcionalidade ou melhoria relevante, mantendo compatibilidade.
- **PATCH**: correção de bug, ajuste pequeno ou melhoria interna.

Enquanto o projeto estiver antes da versão 1.0.0, a API e as funcionalidades ainda podem mudar. A versão atual é 0.2.0.

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
