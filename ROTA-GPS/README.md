# 🗺️ Rota GPS Visualization

Visualizador de rotas GPS baseado em arquivos CSV, desenvolvido com HTML, JavaScript e Leaflet. Permite a importação de dados de rastreamento para visualização interativa em mapa.

## ✨ Funcionalidades

- **📍 Visualização no Mapa:** Plota rotas e pontos de parada utilizando OpenStreetMap.
- **📂 Importação de CSV:** Suporte para carregar múltiplos arquivos CSV (até 5 arquivos) simultaneamente.
- **⏱️ Filtro de Redução de Pontos:** Otimize a visualização filtrando pontos muito próximos no tempo (ex: omitir pontos com diferença menor que 5, 10, 20 ou 30 segundos).
- **📏 Modo Medição:** Ferramenta interativa para medir a distância linear entre dois pontos no mapa.
- **📊 Estatísticas:** Exibe contagem de pontos originais vs. exibidos após filtragem.
- **ℹ️ Detalhes do Ponto:** Clique em qualquer marcador para ver ID, Data/Hora, Velocidade e Coordenadas.

## 📄 Formato do Arquivo CSV

O sistema espera arquivos CSV (separados por vírgula ou ponto-e-vírgula) contendo dados de GPS.

**Colunas esperadas (ordem preferencial):**

1. ID
2. Nome/Descrição
3. Latitude
4. Longitude
5. Velocidade
6. Data/Hora

**Exemplo:**

```csv
546304721;"PLANALTINA II";-15.625308;-47.653454;(parado);"03/02/2026 00:11:12"
546304744;"PLANALTINA II";-15.625308;-47.653454;(parado);"03/02/2026 00:11:13"
```

> **Nota:** O sistema tenta detectar automaticamente o formato. Se o arquivo tiver cabeçalho (`lat`, `lng`), ele será ignorado corretamente.

## 🛠️ Tecnologias

- **HTML5 / CSS3**
- **JavaScript (ES6+)**
- **[Leaflet.js](https://leafletjs.com/)** - Biblioteca para mapas interativos.
- **OpenStreetMap** - Fonte dos dados do mapa.

## 🤖 Automação

O projeto inclui um agente de commit (`agt-commit.md`) para padronizar as mensagens de commit.
Para usar:

```bash
run @agt-commit.md
```
