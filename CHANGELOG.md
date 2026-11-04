# Histórico de versões — Mapa das Ervas Vivas

## [0.3.5] — 2026-11-04

**Resumo:** adiciona encerramento automático de sessões após períodos de inatividade, com aviso prévio.

### Segurança
- Colaboradores: encerramento após 7 dias sem atividade.
- Moderadores e administradores: encerramento após 30 minutos sem atividade.
- Aviso exibido nos 5 minutos anteriores ao encerramento, com opção de continuar conectado.
- Atividade sincronizada entre abas do mesmo navegador; ao expirar, somente a sessão local é encerrada.
- Política implementada no frontend. Os limites nativos de sessão do Supabase no servidor são recursos disponíveis apenas em planos Pro ou superiores, portanto não foram alteradas configurações pagas.

### Validação
- Código e versionamento registrados na branch main.
- Build, deploy e testes reais: pendentes.

---

## [0.3.4] — 2026-11-03

**Resumo:** atualiza a linguagem do botão de contribuição e melhora o alinhamento do nome com a marca no cabeçalho.

### Alterado
- Botão principal passa a usar “Registrar descoberta”, reforçando a proposta colaborativa do mapa.
- Marca e nome “Ervas Vivas” passam a compartilhar alinhamento vertical central, com dimensões ajustadas para desktop e celular.

### Validação
- Alterações registradas na branch main.
- Build, deploy e conferência visual em dispositivos: pendentes.

---

## [0.3.3] — 2026-11-03

**Resumo:** simplifica a administração de contas, concentrando busca, filtros e edição em uma tela própria de Usuários.

### Alterado
- O painel administrativo mostra apenas a entrada “Usuários”, sem lista de contas embutida.
- Busca, filtros por nível, ordenação, paginação e edição ficam dentro da janela Usuários.
- A lista de contas só é consultada quando o administrador abre Usuários, não ao entrar no painel de moderação.
- A própria conta aparece identificada como “Sua conta”, sem seletor ou botão de edição.

### Validação
- Código registrado na branch main.
- Build, deploy e teste visual: pendentes.

---

## [0.3.2] — 2026-11-03

**Resumo:** reduz o volume de dados da gestão de colaboradores e adiciona filtros e paginação.

### Alterado
- Ao abrir o painel administrativo, a lista inicial consulta somente cinco perfis, com uma sexta linha usada apenas para detectar próxima página.
- Paginação de cinco contas por vez, sem carregar a lista inteira.
- Busca por nome aplicada somente ao enviar o formulário.
- Filtro por nível: administrador, moderador ou colaborador.
- Ordenação por cadastro mais recente, mais antigo ou nome (A–Z).
- Exibe a data de cadastro na linha do colaborador.

### Validação
- Alterações registradas na branch main.
- Build, deploy e testes com volume real de contas: pendentes.

---

## [0.3.1] — 2026-11-03

**Resumo:** torna a gestão de papéis dos colaboradores mais clara e segura contra alterações acidentais.

### Alterado
- A lista mostra a função atual de cada pessoa sem apresentar um seletor ativo.
- A alteração de nível exige tocar em “Editar”, escolher a nova função e confirmar em “Salvar”.
- “Cancelar” fecha a edição sem alterar o papel salvo.
- O próprio administrador continua protegido e não pode editar seu nível por esta tela.

### Validação
- Código e histórico registrados na branch main.
- Build, deploy e teste real da alteração de papéis: pendentes.

---

## [0.3.0] — 2026-11-03

**Resumo:** adiciona busca de plantas pela área visível do mapa, no estilo “Pesquisar nesta área”.

### Adicionado
- O botão “Pesquisar nesta área” aparece após o usuário mover o mapa para uma região diferente.
- A busca consulta no Supabase apenas plantas aprovadas cujas coordenadas estejam dentro dos limites geográficos visíveis.
- A paginação de 200 registros continua funcionando dentro da área pesquisada.
- A movimentação do mapa não dispara consultas automaticamente; a busca ocorre somente ao tocar no botão.

### Validação
- Implementação registrada na branch main.
- Build, deploy e testes em dispositivo: pendentes.

---

As versões seguem o padrão SemVer: MAJOR.MINOR.PATCH.

- **MAJOR**: mudança estrutural incompatível ou grande marco de estabilidade.
- **MINOR**: nova funcionalidade ou melhoria relevante, mantendo compatibilidade.
- **PATCH**: correção de bug, ajuste pequeno ou melhoria interna.

Enquanto o projeto estiver antes da versão 1.0.0, a API e as funcionalidades ainda podem mudar. A versão atual é 0.3.4.

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
