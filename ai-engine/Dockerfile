# Use a lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file
COPY requirements.txt .

# --- THE FIX ---
# 1. Upgrade pip to prevent hash mismatch bugs
RUN pip install --upgrade pip
# 2. Force the CPU-only version of PyTorch to drastically reduce image size and build time
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

# Copy the rest of the AI engine code
COPY . .

# Expose the port FastAPI runs on
EXPOSE 8000

# Command to boot the AI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]