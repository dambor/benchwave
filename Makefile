# Makefile

.PHONY: all backend frontend install-frontend start-frontend run

all: run

# Run the backend
backend:
	@echo "Starting backend..."
	python backend/main.py

# Install frontend dependencies
install-frontend:
	@echo "Installing frontend dependencies..."
	cd frontend && yarn install

# Start the frontend
start-frontend:
	@echo "Starting frontend..."
	cd frontend && yarn start

# Run both frontend and backend
run: install-frontend
	@echo "Starting both backend and frontend..."
	@# Run backend and frontend in parallel (suppress output merging with &)
	@python backend/main.py & \
	cd frontend && yarn start
