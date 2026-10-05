# Use Python 3.10 for the AI Engine.
FROM python:3.10-slim

# Set the working directory inside the container.
WORKDIR /app

# Copy the dependency list into the container.
COPY requirements.txt .

# Install the Python dependencies listed in requirements.txt.
RUN pip install --no-cache-dir -r requirements.txt

# Copy the AI Engine source code into the container.
COPY . .

# Document the port the AI Engine listens on.
EXPOSE 7860

# Start the FastAPI server and allow connections from outside the container.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]