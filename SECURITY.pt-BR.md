# Política de Segurança

*[English](SECURITY.md) · [Español](SECURITY.es.md)*

## Versões suportadas

O Jaguar ainda não possui releases com versão marcada; correções de segurança são aplicadas apenas ao código mais recente da branch padrão. Quando existirem releases versionados, esta seção será atualizada para refletir quais versões recebem correções.

## Reportando uma vulnerabilidade

Por favor, **não** abra uma issue pública no GitHub para vulnerabilidades de segurança.

Em vez disso, use o recurso de relato privado de vulnerabilidades do GitHub para este repositório (aba **Security** → **Report a vulnerability**). Isso abre uma conversa privada com os mantenedores sem divulgar detalhes publicamente antes que exista uma correção.

Ao reportar, inclua se possível:

- Uma descrição do problema e seu impacto potencial
- Passos para reproduzir (ou uma prova de conceito, se aplicável)
- A(s) plataforma(s) afetada(s) (Windows/macOS/Linux), se relevante

Faremos o possível para confirmar o recebimento rapidamente e manter você atualizado enquanto o problema é investigado e corrigido.

## Escopo e contexto

O Jaguar é um aplicativo desktop local-first construído com Tauri:

- Não tem backend, não tem contas de usuário, e não transmite nenhum dado pela rede. Não coleta telemetria ou analytics.
- Lê/escreve arquivos apenas dentro de pastas que você escolhe explicitamente (via diálogos nativos de arquivo/pasta) para seus projetos e os assets importados neles.
- A principal superfície de ataque relevante, portanto, são as capabilities de sistema de arquivos do shell do Tauri e qualquer dependência de terceiros (pacotes npm/crates do Cargo) — relatos de vulnerabilidades em dependências também são bem-vindos, mesmo que o caminho prático de exploração não esteja claro.
