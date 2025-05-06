# Makefile

.PHONY: all install-frontend backend frontend run

all: run

install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && yarn install

backend:
	@echo "Starting backend..."
	python backend/main.py

frontend:
	@echo "Starting frontend..."
	cd frontend && yarn start

run: install-frontend
	@echo "Starting backend and frontend concurrently..."
	cd frontend && yarn dev || echo "Frontend or backend crashed. Check logs above."
