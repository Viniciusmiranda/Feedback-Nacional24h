# Guia de Instalação Rápida - Evolution API v2

Este guia ajuda você a instalar a Evolution API no seu VPS usando Docker.

## 1. Pré-requisitos no VPS
Certifique-se de ter o Docker e Docker Compose instalados.
```bash
# Exemplo para Ubuntu
sudo apt update
sudo apt install docker.io docker-compose-v2 -y
```

## 2. Instalação
1. Crie uma pasta no seu VPS (ex: `/opt/evolution-api`).
2. Copie os arquivos `docker-compose.yml` e `.env` desta pasta para lá.
3. Edite o arquivo `.env` e **mude as senhas**!

## 3. Rodando
Dentro da pasta, execute:
```bash
docker compose up -d
```

## 4. Testando
Acesse no seu navegador ou via Postman:
`http://SEU_IP_VPS:8080`

Para configurar o Webhook, use a URL da API (ex: `http://SEU_IP_VPS:8080`) nas suas configurações.
A documentação completa está em: https://doc.evolution-api.com/
