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

## Como consumir a biblioteca em outro projeto Angular
1. Instale a biblioteca publicada (`npm i forms-workflow`) ou, durante o desenvolvimento local, use `npm link forms-workflow` após rodar `npm run build:lib` aqui. Instale também os _peer dependencies_ listados em `projects/forms-workflow/package.json` (Angular 20, Angular Material, FontAwesome e os pacotes `@angulartoolsdr`).
2. Exponha os _assets_ de tradução da biblioteca no seu projeto. Inclua em `angular.json` (ou no `project.json` equivalente) um item de `assets` apontando para `node_modules/forms-workflow/assets`, por exemplo:

   ```json
   {
     "glob": "**/*",
     "input": "node_modules/forms-workflow/assets",
     "output": "assets/forms-workflow"
   }
   ```

   Ajuste o caminho no `TranslationService` do `@angulartoolsdr/translation` conforme a convenção usada no seu app.
3. Importe os componentes standalone expostos no `public-api`: `FlowDesignerComponent`, `WorkflowListComponent`, `RunFormComponent` e `RunSummaryComponent`. Eles podem ser usados diretamente em um componente pai:

   ```ts
   import { Component } from '@angular/core';
   import { FlowDesignerComponent } from 'forms-workflow';

   @Component({
     selector: 'app-flow-shell',
     standalone: true,
     imports: [FlowDesignerComponent],
     template: '<app-flow-designer />'
   })
   export class FlowShellComponent {}
   ```
4. Para montar as telas via roteamento, reaproveite as rotas exportadas pela biblioteca. O exemplo abaixo replica a navegação usada no _playground_ deste repositório:

   ```ts
   import { Routes } from '@angular/router';
   import { FlowDesignerComponent, FORMS_ROUTES, RunFormComponent, RunSummaryComponent, WorkflowListComponent } from 'forms-workflow';

   export const routes: Routes = [
     { path: '', pathMatch: 'full', redirectTo: 'flow' },
     {
       path: 'flow',
       children: [
         { path: '', component: WorkflowListComponent },
         { path: 'designer', component: FlowDesignerComponent }
       ]
     },
     { path: 'run', component: RunFormComponent },
     { path: 'run/summary', component: RunSummaryComponent }
   ];
   ```

5. Garanta que os _providers_ básicos estejam registrados (roteamento com `provideRouter`, `provideHttpClient`, `provideAnimations` e os módulos que configuram ícones/temas do Angular Material) para que os componentes funcionem como no exemplo da aplicação de demonstração (`src/main.ts`).
