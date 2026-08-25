# AWS Integration Plan for MedShield DSS

## 1. Executive Summary
This document outlines the proposed architecture and integration plan for migrating the MedShield Enterprise Decision-Support System (DSS) into Amazon Web Services (AWS). It focuses on ensuring high availability for the Next.js frontend, scalable containerized orchestration for the Flask-based API Gateway and microservices, and robust execution environments for the 17-model Python computational suite.

## 2. Current Architecture Context
- **Frontend**: Next.js Dashboard.
- **Backend API Gateway**: Flask (`backend/app.py`) acting as a gateway and routing to microservices (`ANALYTICS_SERVICE_URL`, `PRODUCT_SERVICE_URL`).
- **Data Pipeline & Models**: Python scripts (e.g., `compute_all_models.py`) using Pandas, Scikit-Learn (Cosine Similarity), and SciPy (Linear Programming) to run 10 distinct descriptive, predictive, and prescriptive models (including STL Decomposition, Prophet/XGBoost Forecasting, and EOQ/ROP Calculations).
- **Database/Auth**: Supabase Postgres RPCs with a local JSON-based authentication fallback.

## 3. Proposed AWS Architecture

### 3.1. Compute & Frontend Hosting
- **AWS Amplify / Vercel on AWS**: To host the Next.js frontend, utilizing edge caching (CloudFront) and serverless functions for Next.js API routes.
- **Amazon ECS (Fargate)**: The Flask API Gateway and Analytics/Product microservices will be containerized using Docker and deployed on ECS Fargate for serverless, scalable orchestration. 

### 3.2. Machine Learning & Model Execution Pipeline
- **AWS Step Functions & AWS Batch**: To orchestrate the execution of the 10-model analytical suite (`compute_all_models.py`). 
  - Since models like Linear Programming inventory allocation and XGBoost require significant memory/CPU, **AWS Batch** (running on EC2 or Fargate) is ideal for executing these intensive Python jobs on a scheduled basis or upon new data ingestion.
  - Step Functions will manage the pipeline: Trigger -> Data Validation -> Model Execution -> Result Consolidation.
- **Amazon SageMaker (Optional)**: If the forecasting models (GBR, XGBoost) require retraining at scale, SageMaker can be introduced for model training, registry, and inference endpoints.

### 3.3. Data Storage & Database
- **Amazon S3**: For storing raw sales data, external regressors (DOH, PAGASA data), and the processed output snapshots (`dashboard_sales_snapshot.json`).
- **Amazon RDS for PostgreSQL**: To migrate away from Supabase, RDS provides a managed relational database for structured sales data, user schemas, and system state.
- **Amazon ElastiCache (Redis)**: To cache the processed dashboard outputs (e.g., area clusters, product-region matches, allocation recommendations) served by the Flask Gateway, replacing or supplementing the static JSON snapshot.

### 3.4. Security & Access Management
- **AWS IAM**: Fine-grained role-based access for ECS Tasks and Batch jobs (e.g., granting the Python model execution role read/write access to specific S3 buckets).
- **Amazon Cognito**: To replace the Supabase and local JSON fallback authentication, providing secure user pools and JWT issuance for the Flask API Gateway.

## 4. Integration Phases

### Phase 1: Storage & Frontend Migration (Weeks 1-2)
- Set up S3 buckets for data ingestion and processed snapshots.
- Deploy the Next.js frontend to AWS Amplify.
- Update data paths in the Python pipeline to read from/write to S3 instead of local directories.

### Phase 2: Backend Microservices & Auth (Weeks 3-4)
- Containerize the Flask API Gateway and microservices.
- Deploy to Amazon ECS (Fargate).
- Provision RDS PostgreSQL and migrate the Supabase schema and functions.
- Transition authentication to Amazon Cognito.

### Phase 3: ML Pipeline Orchestration (Weeks 5-6)
- Package `compute_all_models.py` into a Docker container with all required dependencies (Pandas, Scikit-Learn, SciPy).
- Configure AWS Batch to execute the container.
- Build AWS Step Functions to orchestrate the pipeline: trigger Batch job -> save `dashboard_sales_snapshot.json` to S3 -> invalidate ElastiCache.

## 5. Potential Challenges & Mitigation
- **Computational Overhead**: Running 17 models synchronously could cause timeouts if triggered via API. 
  - *Mitigation*: The models must run asynchronously via AWS Batch, generating the JSON snapshot to S3, while the API gateway simply serves the pre-computed snapshot.
- **Dependency Management**: Scikit-Learn and SciPy packages can result in large image sizes. 
  - *Mitigation*: Use optimized base images (e.g., `python:3.11-slim`) and multi-stage Docker builds.

## 6. Next Steps
1. Create Dockerfiles for the Python model execution environment and microservices.
2. Provision sandbox environment for S3, RDS, and ECS.
3. Establish CI/CD pipelines (GitHub Actions) for automated deployment to ECR and ECS.
