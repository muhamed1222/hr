#!/bin/bash

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking project dependencies..."

# Проверка npm audit
echo -e "\n${YELLOW}Running security audit...${NC}"
npm audit
AUDIT_EXIT_CODE=$?

if [ $AUDIT_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ No security vulnerabilities found${NC}"
else
    echo -e "${RED}✗ Security vulnerabilities found${NC}"
fi

# Проверка устаревших пакетов
echo -e "\n${YELLOW}Checking for outdated packages...${NC}"
OUTDATED=$(npm outdated)
if [ -z "$OUTDATED" ]; then
    echo -e "${GREEN}✓ All packages are up to date${NC}"
else
    echo -e "${RED}✗ Outdated packages found:${NC}"
    npm outdated
fi

# Проверка фронтенда
if [ -d "frontend" ]; then
    echo -e "\n${YELLOW}Checking frontend dependencies...${NC}"
    cd frontend

    echo -e "\n${YELLOW}Running frontend security audit...${NC}"
    npm audit
    FRONTEND_AUDIT_EXIT_CODE=$?

    if [ $FRONTEND_AUDIT_EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✓ No frontend security vulnerabilities found${NC}"
    else
        echo -e "${RED}✗ Frontend security vulnerabilities found${NC}"
    fi

    echo -e "\n${YELLOW}Checking for outdated frontend packages...${NC}"
    FRONTEND_OUTDATED=$(npm outdated)
    if [ -z "$FRONTEND_OUTDATED" ]; then
        echo -e "${GREEN}✓ All frontend packages are up to date${NC}"
    else
        echo -e "${RED}✗ Outdated frontend packages found:${NC}"
        npm outdated
    fi
    cd ..
fi

# Итоговый статус
if [ $AUDIT_EXIT_CODE -eq 0 ] && [ -z "$OUTDATED" ] && [ $FRONTEND_AUDIT_EXIT_CODE -eq 0 ] && [ -z "$FRONTEND_OUTDATED" ]; then
    echo -e "\n${GREEN}✓ All dependency checks passed${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some dependency checks failed${NC}"
    echo -e "${YELLOW}Please review the output above and update dependencies as needed${NC}"
    echo -e "Run 'npm update' to update packages to their latest compatible versions"
    exit 1
fi 