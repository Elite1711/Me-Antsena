FROM python:3.12-slim
WORKDIR /app
COPY ML/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt
COPY ML/app /app/ML/app
EXPOSE 8000
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "ML.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
