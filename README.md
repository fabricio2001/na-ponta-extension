# Na Ponta — extensão pessoal para Brave

Perguntas e respostas para consultar durante reuniões. Sem dependências, conta, servidor ou conexão à internet. Os dados ficam em `chrome.storage.local` no perfil do navegador.

## Instalar

1. Abra `brave://extensions` no Brave.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e selecione esta pasta (`C:\Programacao\Codex\Anotacao`).
4. Fixe **Na Ponta** no menu de extensões. Clique no ícone para abrir o painel lateral.
5. Na engrenagem, cadastre suas perguntas na página de configurações.

Use uma versão atual do Brave com suporte à API `sidePanel`. Também é possível abrir a consulta em uma aba pelo botão **Abrir consulta** das configurações.

## Usar

- Clique em uma pergunta para abrir sua resposta. Abrir outra fecha a anterior; clicar na mesma recolhe a resposta.
- Para ler sobre o Teams, escolha **Configurações → Onde mostrar a resposta → Modal transparente na página**. Abra o Teams no Brave e escolha uma pergunta no painel lateral. Arraste o cabeçalho para mover, use **Centralizar** e ajuste **Transparência** (0–100%) no próprio modal. O texto permanece opaco. Outra pergunta substitui a resposta no mesmo modal. **Esc** ou **×** fecha. Não abre janela separada e não bloqueia cliques fora do cartão. O Teams do Windows não é suportado; use o Teams Web. A antiga opção de janela flutuante é convertida automaticamente para este modo.
- O modal funciona em sites HTTP/HTTPS, incluindo o Teams Web, sem precisar conceder acesso temporário a cada aba. Se o Brave restringir o acesso, abra **brave://extensions → Na Ponta → Detalhes → Acesso a sites** e permita o acesso. Páginas internas, como `brave://extensions`, não aceitam o modal. Ao navegar/recarregar a página, escolha a pergunta novamente. A transparência é lembrada durante a sessão do navegador. O conteúdo sobreposto pode aparecer no compartilhamento de tela/aba.
- A busca considera pergunta e resposta e ignora acentos e diferenças entre maiúsculas e minúsculas.
- Em Configurações, crie, edite, exclua ou ordene perguntas pelas setas. O salvamento é automático; confira o indicador **Salvo**.
- A pergunta deve ter um título; a resposta pode ser preenchida depois.
- A lista mostra 60 resultados por vez, com **Mostrar mais** para continuar.
- Apenas uma aba de configurações pode editar os dados por vez.
- Exporte um backup JSON para guardar uma cópia. Importar substitui o conteúdo atual após confirmação e validação.
- Desinstalar a extensão apaga o armazenamento. Exporte antes. Atualize os arquivos e use **Recarregar** na página de extensões para atualizar sem desinstalar.

## Privacidade

As permissões são `storage`, `sidePanel`, `scripting` e acesso a sites HTTP/HTTPS. O acesso permite inserir o modal na página. A extensão não coleta o conteúdo da reunião, não acessa microfone e não envia anotações para a internet. O modal utiliza estilos isolados da página. Os dados não são criptografados pela extensão. O backup é um arquivo de texto JSON.
