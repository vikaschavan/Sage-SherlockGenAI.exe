# ─────────────────────────────────────────────────────────────────────────────
# Sage - Cloud Run Deployment Script (PowerShell)
# Run from "Hackathon Prototype" directory:  .\deploy.ps1
# ─────────────────────────────────────────────────────────────────────────────

$PROJECT_ID = "my-first-project-t3"
$REGION     = "us-central1"
$SERVICE    = "sage"
$IMAGE      = "gcr.io/$PROJECT_ID/$SERVICE"

Write-Host "`n==> [1/4] Setting GCP project..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID

Write-Host "`n==> [2/4] Enabling required APIs..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com --quiet

# Read API key from .env
$envLine = Get-Content "sage\.env" | Where-Object { $_ -match "^GOOGLE_API_KEY=" }
if (-not $envLine) {
    Write-Host "ERROR: GOOGLE_API_KEY not found in sage\.env" -ForegroundColor Red
    exit 1
}
$API_KEY = ($envLine -split "=", 2)[1].Trim('"').Trim("'")
Write-Host "  API key loaded." -ForegroundColor Gray

Write-Host "`n==> [3/4] Building container image..." -ForegroundColor Cyan
Push-Location "sage"
gcloud builds submit --tag $IMAGE --timeout=1200s .
Pop-Location

# Step 4: wipe the broken service if it exists, then deploy clean
Write-Host "`n==> [4/4] Deploying to Cloud Run..." -ForegroundColor Cyan

Write-Host "  Checking for existing service..." -ForegroundColor Gray
$svcJson = gcloud run services describe $SERVICE --region $REGION --format=json 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Existing service found - deleting to avoid env-var type conflicts..." -ForegroundColor Yellow
    gcloud run services delete $SERVICE --region $REGION --quiet
    Write-Host "  Deleted. Deploying fresh..." -ForegroundColor Gray
} else {
    Write-Host "  No existing service - deploying fresh..." -ForegroundColor Gray
}

gcloud run deploy $SERVICE `
    --image $IMAGE `
    --platform managed `
    --region $REGION `
    --allow-unauthenticated `
    --port 8080 `
    --memory 2Gi `
    --cpu 2 `
    --timeout 300 `
    --concurrency 80 `
    --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=false,USE_SQLITE=true,ENV=production,GOOGLE_API_KEY=$API_KEY"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Deploy failed. Check logs:" -ForegroundColor Red
    Write-Host "  gcloud run logs read $SERVICE --region $REGION" -ForegroundColor Red
    exit 1
}

Write-Host "`n==> Done!" -ForegroundColor Green

$SERVICE_URL = gcloud run services describe $SERVICE --region $REGION --format="value(status.url)"

if (-not $SERVICE_URL) {
    Write-Host "ERROR: Could not retrieve service URL." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "  Service URL  : $SERVICE_URL" -ForegroundColor Green
Write-Host "  Health check : $SERVICE_URL/health" -ForegroundColor Green
Write-Host "  Swagger UI   : $SERVICE_URL/docs" -ForegroundColor Green
Write-Host ""
Write-Host "  >>> SUBMIT THIS URL FOR THE HACKATHON <<<" -ForegroundColor Yellow
Write-Host "  $SERVICE_URL" -ForegroundColor Yellow
Write-Host ""

Write-Host "==> Smoke test: /health..." -ForegroundColor Cyan
try {
    $resp = Invoke-RestMethod -Uri "$SERVICE_URL/health" -Method Get
    Write-Host "  $($resp | ConvertTo-Json -Compress)" -ForegroundColor Green
    Write-Host "  PASSED" -ForegroundColor Green
} catch {
    Write-Host "  FAILED - check logs:" -ForegroundColor Red
    Write-Host "  gcloud run logs read $SERVICE --region $REGION" -ForegroundColor Red
}
