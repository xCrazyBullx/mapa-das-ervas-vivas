# Política de versionamento

## Formato

Usamos **MAJOR.MINOR.PATCH**, por exemplo `v1.4.2`.

- MAJOR: arquitetura, mudanças incompatíveis ou marco de estabilidade.
- MINOR: funcionalidade nova ou melhoria significativa.
- PATCH: correção pontual, bug ou ajuste pequeno.

Até a primeira versão estável 1.0.0, o projeto permanece em desenvolvimento. Por isso a versão inicial deste controle é 0.2.0, não 2.x.

## Como registrar uma mudança

Toda alteração que chegue à branch principal deve:
1. Atualizar `package.json` com a nova versão.
2. Adicionar uma entrada no topo de `CHANGELOG.md`.
3. Usar um título curto e um comentário que explique o motivo da mudança.
4. Registrar se houve build, deploy e quais testes foram realmente executados.
5. Associar a versão a um commit identificável.

Formato recomendado para o comentário:
`v0.2.1 — Corrige o carregamento das fotos no painel de moderação.`

## Como voltar a uma versão anterior

Cada versão publicada deve ser marcada com uma tag Git imutável, por exemplo `v0.2.0`, apontando para o commit exato daquela versão.

Para recuperar uma versão:
- Preferir criar uma branch de restauração a partir da tag desejada.
- Conferir o código e testar antes de mover a branch principal.
- Se a versão já estiver em produção, fazer o rollback do deploy para o commit/tag anterior e validar banco e frontend juntos.

**Importante:** voltar apenas o frontend não desfaz mudanças no banco Supabase. Alterações de banco precisam de migrações reversíveis ou de um plano de restauração separado.

## Regra de segurança

Nunca marcar como estável, validada ou pronta para produção uma versão que não tenha build, deploy e testes confirmados. Uma tag identifica o código; não é, por si só, prova de que ele funciona.
