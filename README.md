# FormsWorkflowAngular

Biblioteca Angular para criação e execução de workflows de formulários. Este repositório contém a biblioteca `forms-workflow`, um aplicativo de exemplo e automações para empacotar e publicar versões.

## Scripts principais
- `npm run build:lib`: compila a biblioteca `forms-workflow` para `dist/forms-workflow` usando o `ng-packagr`.
- `npm run test:lib`: executa as especificações da biblioteca em modo headless (ChromeHeadless, sem watch).
- `npm run pack:lib`: gera o pacote `.tgz` da biblioteca após o build (útil para validar a publicação localmente).
- `npm run build`: mantém o build da aplicação de exemplo.
- `npm start`: inicia o servidor de desenvolvimento da aplicação de exemplo.

## Build e testes da biblioteca
1. Instale as dependências: `npm install`.
2. Execute os testes da biblioteca: `npm run test:lib`.
3. Gere os artefatos de distribuição: `npm run build:lib`.

Os estilos SCSS e arquivos de internacionalização sob `projects/forms-workflow/src/assets` são incluídos no pacote final via `ng-package.json`.

## Empacotamento e publicação manual
1. Atualize a versão em `projects/forms-workflow/package.json` (e crie a tag correspondente, ex.: `v0.1.0`).
2. Construa e empacote a biblioteca:

   ```bash
   npm run build:lib
   npm pack dist/forms-workflow
   ```

   O comando acima gera o tarball no diretório atual (ex.: `forms-workflow-0.1.0.tgz`) para validação local.
3. Para publicar no npm:

   ```bash
   cd dist/forms-workflow
   npm publish --access public
   ```

   Garanta que a variável de ambiente `NODE_AUTH_TOKEN` (ou `NPM_TOKEN`) esteja configurada com permissões de publicação.

## Publicação via CI
O workflow `.github/workflows/publish.yml` publica automaticamente versões da biblioteca quando um tag `v*` é enviado ou via _workflow dispatch_. Ele executa `npm ci`, `npm run test:lib`, `npm run build:lib` e publica `dist/forms-workflow` usando o `NPM_TOKEN` configurado nos segredos do repositório. Certifique-se de que o tag criado corresponda à versão definida em `projects/forms-workflow/package.json`.
