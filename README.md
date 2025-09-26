# WhatsApp AI Bot - Yue-F Integration

Um bot inteligente para WhatsApp integrado com o modelo de IA Yue-F via API Ollama.

## 🚀 Características

- **Conversas Naturais**: Interaja com a IA Yue-F diretamente pelo WhatsApp
- **Contexto Persistente**: Mantém o histórico da conversa para respostas mais relevantes
- **Comandos Úteis**: Sistema de comandos para controlar o bot
- **Respostas Inteligentes**: Divisão automática de mensagens longas
- **Interface Familiar**: Usa o WhatsApp Web para máxima compatibilidade

## 📋 Pré-requisitos

- Node.js 18+ instalado
- Chrome/Chromium browser
- Conexão estável com a internet
- Acesso ao WhatsApp Web

## 🛠️ Instalação

1. **Clone o repositório**:
```bash
git clone <repository-url>
cd whatsapp-ai
```

2. **Instale as dependências**:
```bash
npm install
```

3. **Configure as variáveis de ambiente**:
```bash
cp .env.example .env
```
Edite o arquivo `.env` se necessário (as configurações padrão devem funcionar).

4. **Execute o bot**:
```bash
npm start
```

5. **Escaneie o QR Code**:
   - Um QR code aparecerá no terminal
   - Abra o WhatsApp no seu celular
   - Vá em "Dispositivos Conectados" > "Conectar um dispositivo"
   - Escaneie o QR code exibido no terminal

## 🎮 Como Usar

### Comandos Disponíveis

- `/help` - Mostra a lista de comandos disponíveis
- `/reset` - Limpa o histórico da conversa atual
- `/status` - Verifica o status do bot e da API
- `/about` - Informações sobre o bot

### Conversação Normal

Simplesmente envie qualquer mensagem de texto para o bot e ele responderá usando a IA Yue-F. O bot mantém o contexto da conversa automaticamente.

### Exemplos de Uso

```
Usuário: Olá! Como você pode me ajudar?
Bot: Olá! Sou um assistente de IA powered by Yue-F. Posso ajudar com...

Usuário: /status
Bot: 📊 Status do Bot
API Yue-F: ✅ Online
Conversas ativas: 1
...

Usuário: /reset
Bot: 🔄 Contexto da conversa limpo!
```

## ⚙️ Configuração

### Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|---------|
| `YUE_F_API_URL` | URL da API Yue-F | `https://llms.yuricunha.com` |
| `YUE_F_MODEL_NAME` | Nome do modelo | `yue-f` |
| `API_TIMEOUT` | Timeout da API (ms) | `30000` |
| `BOT_NAME` | Nome do bot | `WhatsApp AI Bot` |
| `MAX_CONTEXT_MESSAGES` | Máx. mensagens no contexto | `20` |
| `MESSAGE_SPLIT_LENGTH` | Tamanho máx. da mensagem | `1500` |

### Estrutura do Projeto

```
whatsapp-ai/
├── src/
│   ├── bot/
│   │   └── whatsappBot.js      # Classe principal do bot
│   ├── commands/
│   │   └── commandHandler.js   # Manipulador de comandos
│   ├── config/
│   │   └── config.js          # Configurações
│   ├── services/
│   │   ├── yueApiService.js   # Cliente da API Yue-F
│   │   ├── conversationService.js # Gerenciamento de contexto
│   │   └── messageService.js  # Processamento de mensagens
│   └── index.js               # Ponto de entrada
├── .env                       # Variáveis de ambiente
├── package.json              # Dependências do projeto
└── README.md                 # Este arquivo
```

## 🔧 Desenvolvimento

### Scripts Disponíveis

```bash
npm start      # Inicia o bot
npm run dev    # Inicia com nodemon (auto-reload)
```

### Logs e Debug

Para habilitar logs detalhados, defina `DEBUG=true` no arquivo `.env`.

## 📊 Status da Implementação

### ✅ Fase 1 - Funcionalidade Básica (Atual)
- [x] Conexão básica com WhatsApp
- [x] Integração com API Yue-F (Ollama compatible)
- [x] Funcionalidade de echo de mensagens
- [x] Tratamento básico de erros
- [x] Sistema de comandos básico
- [x] Gerenciamento de contexto de conversa

### 🔄 Próximas Fases
- [ ] Sistema de contexto avançado
- [ ] Indicadores de digitação
- [ ] Divisão inteligente de mensagens
- [ ] Monitoramento e logs avançados
- [ ] Testes automatizados
- [ ] Deploy em produção

## 🛡️ Segurança e Privacidade

- **Dados Temporários**: O contexto da conversa é armazenado apenas em memória
- **Sem Logs Pessoais**: Não fazemos log de dados pessoais dos usuários
- **HTTPS**: Toda comunicação com a API é criptografada
- **Conformidade**: Respeita os Termos de Serviço do WhatsApp

## 🐛 Solução de Problemas

### Problemas Comuns

1. **QR Code não aparece**:
   - Verifique se o Chrome/Chromium está instalado
   - Tente executar com `DEBUG=true npm start`

2. **Bot não responde**:
   - Verifique se a API Yue-F está online usando `/status`
   - Verifique sua conexão com a internet
   - Reinicie o bot

3. **Erro de autenticação**:
   - Delete a pasta `session/` e escaneie o QR code novamente
   - Certifique-se de que o WhatsApp Web não está aberto em outro lugar

### Logs de Erro

Os logs são exibidos no console. Para logs detalhados:

```bash
DEBUG=true npm start
```

## 📞 Suporte

- **Issues**: Abra uma issue no GitHub para problemas técnicos
- **Documentação**: Consulte este README para dúvidas comuns
- **API**: Verifique a documentação da API Yue-F em caso de problemas de conectividade

## 📝 Changelog

### v1.0.0 (Setembro 2025)
- Implementação inicial da Fase 1
- Conexão básica com WhatsApp Web
- Integração com API Yue-F via Ollama
- Sistema de comandos básico
- Gerenciamento de contexto de conversa
- Tratamento básico de erros

## 📄 Licença

MIT License - veja o arquivo LICENSE para detalhes.

---

**Desenvolvido com ❤️ usando Node.js + WhatsApp Web + Yue-F AI**
