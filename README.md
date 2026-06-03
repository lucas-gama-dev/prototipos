# 🚑 IMG-VIATURAS-SAMU

Ferramenta de **mapeamento cartesiano** para checklist visual de viaturas do SAMU. Permite posicionar pontos de inspeção sobre imagens reais dos veículos usando coordenadas percentuais (0–100).

![Protótipo](./PROTOTIPO-DE-MAPEAMENTO-CARTESIANO.png)

## ✨ Funcionalidades

- **Seleção por tipo de veículo** — dropdown agrupa por marca/modelo (Mercedes Sprinter, Renault Master, Toyota SW4, Yamaha Versys)
- **Múltiplas vistas** — cada veículo possui imagens de frente/lateral e traseira, navegáveis por abas
- **Modo lado a lado** — visualize frente e traseira simultaneamente no modo dual
- **Pontos únicos por tipo** — cada item de checklist pertence a uma única imagem, sem duplicações entre frente e traseira
- **Coordenadas percentuais** — sistema (0,0) no canto superior esquerdo a (100,100) no inferior direito
- **Click-to-place** — clique na imagem para capturar coordenadas automaticamente
- **Persistência local** — dados salvos em `localStorage`
- **Exportação JSON** — todos os pontos mapeados exportáveis em formato JSON

## 🗂️ Veículos Disponíveis

| Veículo | Tipo | Imagens |
| --------- | ------ | --------- || Mercedes Sprinter | USB / USA / USI | Frente/Lateral + Traseira |
| Renault Master | USB / USA / USI | Frente/Lateral + Traseira |
| Toyota SW4 | VIR / VIM | Frente + Traseira |
| Yamaha Versys | Motolância | Frente + Traseira |

## 🚀 Como Usar

1. Sirva os arquivos com qualquer servidor HTTP local:

   ```bash
   # Exemplo com Python
   python -m http.server 8017

   # Exemplo com Node
   npx serve -p 8017
   ```

2. Abra no navegador:
   ```text
   http://localhost:8017/preview.html
   ```

3. Selecione o tipo de veículo, escolha a vista (frente/traseira) e clique na imagem para posicionar pontos de checklist.

## 📁 Estrutura

```text
├── preview.html          # Página principal
├── app.js                # Lógica da aplicação
├── style.css             # Estilos (responsivo)
├── MERCEDES-SPRINTER-USB-USA-USI/
│   ├── V2-MERCEDES-SPRINTER-FRENTE.jpg
│   └── V2-MERCEDES-SPRINTER-TRASEIRA.jpg
├── RENAULT-MASTER-USB-USA-USI/
│   ├── V1-RENAULT-MASTER-FRENTE.png
│   └── V1-RENAULT-MASTER-TRASEIRA.png
├── TOYOTA-SW4-VIR-VIM/
│   ├── V3-TOYOTA-SW4-FRENTE.png
│   └── V3-TOYOTA-SW4-TRASEIRA.png
└── YAMAHA-VERSYS-MOTOLANCIA/
    ├── V1-YAMAHA-VERSYS-FRENTE.png
    └── V1-YAMAHA-VERSYS-TRASEIRA.png
```

## 🔧 Tecnologias

- HTML5, CSS3, JavaScript (Vanilla)
- Sem dependências externas
- Responsivo (desktop, tablet, mobile)
- `localStorage` para persistência

## 📝 Nomenclatura de Imagens

As imagens seguem o padrão:

```text
V{versão}-{MARCA}-{MODELO}-{VISTA}.{ext}
```

Exemplo: `V2-MERCEDES-SPRINTER-FRENTE.jpg`

Apenas a versão mais recente de cada imagem é utilizada pelo sistema.
