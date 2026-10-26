# k6 Performance Lab

Repositório de testes de estudo com Grafana k6 contra a demonstração QuickPizza.
Não é destinado a testes de produção.

## Instalar

Instale o [Grafana k6](https://grafana.com/docs/k6/latest/set-up/install-k6/).
Node.js/npm são necessários apenas para instalar os tipos do k6 e usar os atalhos
do `package.json`.

```sh
npm install
k6 version
```

## Executar

```sh
npm run smoke:quickpizza
npm run load:quickpizza
npm run stress:quickpizza
npm run spike:quickpizza
npm run soak:quickpizza
npm run breakpoint:quickpizza
npm run browser:quickpizza
```

Também é possível chamar um script diretamente:

```sh
k6 run scripts/quickpizza/smoke.js
k6 run -e VUS=5 -e DURATION=2m scripts/quickpizza/load.js
K6_BROWSER_HEADLESS=true k6 run scripts/quickpizza/browser.js
```

Stress, spike, soak e breakpoint ficam desativados por padrão. Para cargas mais
altas, execute QuickPizza localmente via Docker e defina `BASE_URL`:

```sh
docker run -p 3333:3333 ghcr.io/grafana/quickpizza-local:latest
k6 run -e BASE_URL=http://localhost:3333 -e ENABLE_HIGH_LOAD=true scripts/quickpizza/stress.js
```

## Gerar reports

Ao final de cada execução, o k6 gera automaticamente:

- `results/summary.json`
- `results/summary.html`

Os workflows também publicam a pasta `results/` como artifact. Os reports são
ignorados pelo Git; somente `results/.gitkeep` é versionado.