FROM mcr.microsoft.com/devcontainers/typescript-node:22-bookworm

RUN apt-get update

EXPOSE 3000 5173 4444

USER node

# Install OpenCode CLI
RUN curl -fsSL https://opencode.ai/install | bash
