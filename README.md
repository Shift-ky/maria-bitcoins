# Mar Bitcoin IA

Aplicação independente em português para acompanhar o mercado do Bitcoin e testar decisões com reais e BTC virtuais. As cotações vêm do CoinGecko. O simulador compara cotações consecutivas.

## Executar com Docker

Requer Docker com Compose. Na primeira execução, o Docker baixa as imagens `node:24-alpine` e `nginx:alpine` e instala as dependências npm dentro da etapa de build.

```sh
docker compose up --build -d
```

Abra [http://localhost:8080](http://localhost:8080). O build executa os testes unitários e gera a PWA antes de copiar os arquivos para o Nginx. Para encerrar, execute `docker compose down`.

## Desenvolver e testar

Com as dependências já disponíveis, use `npm run dev` para desenvolvimento, `npm test` para testes unitários e de IndexedDB, e `npm run build` seguido de `npm run preview` para testar a PWA em produção.

Os testes de interface usam o build de produção, cotações controladas e Chromium. Com o navegador já disponível, execute:

```sh
npm run build
MAR_CHROMIUM_PATH=/caminho/do/chromium npm run test:browser
```

Esses testes cobrem carteira persistente, simulação, backtesting, exportação, tema, navegação em tela pequena e suspensão offline. Eles bloqueiam o service worker para isolar os dados dos testes. Para conferir instalação e recarga offline, abra o build por HTTPS ou em localhost, aguarde o carregamento dos dados e confirme que o service worker está ativo nas ferramentas do navegador. Depois desconecte, recarregue e confira a cotação armazenada e a carteira. No celular, use uma origem HTTPS acessível pelo dispositivo, como o GitHub Pages.

## Carteira e simulador

- A carteira começa com R$ 10.000 fictícios. Use **Minha carteira** para fazer aportes ou definir um novo capital inicial reiniciando a carteira.
- Em **Robô IA**, inicie, pause ou interrompa o simulador enquanto a aplicação estiver aberta. A primeira cotação válida define a referência. Uma alta abre uma posição virtual quando a carteira está sem BTC. O limite de exposição vale na compra. Carteiras novas começam com limite de 100%, e carteiras existentes mantêm o limite salvo.
- A venda é disparada quando o lucro líquido estimado fica em 70% ou menos do maior lucro líquido registrado na posição. Sem taxas, uma posição comprada por R$ 100 que atingiu R$ 130 tem pico de lucro de R$ 30. O gatilho fica em R$ 121. A venda usa a cotação registrada no momento do disparo, que pode passar pelo gatilho entre consultas.
- O limite de queda patrimonial ainda interrompe a simulação. Se a mesma cotação também acionar a venda por recuo do lucro, a venda simulada é registrada antes da interrupção.
- As compras e vendas geram avisos no painel. Ative as notificações do navegador na aba **Robô IA** para receber os mesmos avisos pelo sistema. A venda mostra o lucro ou prejuízo líquido após as taxas.
- Os relatórios mostram o resultado realizado em janelas móveis de 1, 7 e 30 dias e a evolução patrimonial observada. O resultado de uma venda inclui as taxas de compra e venda. A referência de manter BTC usa o mesmo capital e os mesmos aportes, sem taxas.
- O backtesting usa as duas observações anteriores para gerar o sinal e a observação seguinte para executar. A frequência das amostras depende do período fornecido pelo CoinGecko. O modelo usa preços pontuais e desconsidera derrapagem e liquidez.
- A cotação atual é consultada a cada 90 segundos e a série de mercado a cada seis minutos. A aplicação reduz a frequência após falhas de cotação e conserva os dados em cache. Uma falha, um preço desatualizado ou a perda da conexão suspendem novas decisões até a recuperação.
- A carteira, as operações, as configurações e os dados recentes ficam no IndexedDB deste navegador. A limpeza dos dados do site reinicia a carteira. Um CSV exporta as decisões visíveis no filtro da página **Operações**.

## Publicar no GitHub Pages

Crie um repositório independente chamado `mar-bitcoin-ia`. Em **Settings → Pages → Build and deployment**, selecione **GitHub Actions**. Configure o remoto do repositório local e envie a branch `main`. O workflow [pages.yml](.github/workflows/pages.yml) testa e compila no Docker e publica a pasta `dist`. Os caminhos relativos e a navegação por hash funcionam no subdiretório do repositório.

## Estrutura

- `src/components` e `src/pages` contêm a interface.
- `src/services`, `src/hooks` e `src/storage` conectam o CoinGecko, o IndexedDB e a interface.
- `src/engine` separa análise, execução simulada e backtesting.
- `tests` reúne testes financeiros, de persistência e de interface.
- `vite.config.ts` configura o build e o cache da PWA.
