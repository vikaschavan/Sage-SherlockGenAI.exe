# Sage - Cloud Run Deployment Script (PowerShell)
# Run from "Hackathon Prototype" directory: .\deploy.ps1

$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$PROJECT_ID = "my-first-project-t3"
$REGION = "us-central1"
$SERVICE = "sage"
$IMAGE = "gcr.io/$PROJECT_ID/$SERVICE"
$GEMINI_SECRET_NAME = "GOOGLE_API_KEY"
$TOKEN_SECRET_NAME = "GOOGLE_TOKEN_JSON"
$CLIENT_SECRET_NAME = "GOOGLE_CLIENT_SECRET_JSON"
$TOKEN_MOUNT_PATH = "/secrets/google-token/token.json"
$CLIENT_SECRET_MOUNT_PATH = "/secrets/google-client/client_secret.json"
$TOKEN_LOCAL_PATH = "sage\token.json"
$CLIENT_SECRET_LOCAL_PATH = "sage\auth\client_secret.json"

function Ensure-SecretFromFile {
    param(
        [string]$SecretName,
        [string]$FilePath
    )

    $exists = $true
    try {
        gcloud secrets describe $SecretName --project $PROJECT_ID *> $null
    } catch {
        $exists = $false
    }

    if (-not $exists) {
        gcloud secrets create $SecretName --project $PROJECT_ID --data-file=$FilePath | Out-Null
    } else {
        gcloud secrets versions add $SecretName --project $PROJECT_ID --data-file=$FilePath | Out-Null
    }
}

function Ensure-SecretFromText {
    param(
        [string]$SecretName,
        [string]$SecretValue
    )

    $tmpFile = Join-Path $env:TEMP "$SecretName.txt"
    try {
        Set-Content -LiteralPath $tmpFile -Value $SecretValue -NoNewline
        Ensure-SecretFromFile -SecretName $SecretName -FilePath $tmpFile
    } finally {
        Remove-Item -LiteralPath $tmpFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "`n==> [1/5] Setting GCP project..." -ForegroundColor Cyan
gcloud config set project $PROJECT_ID | Out-Null

Write-Host "`n==> [2/5] Enabling required APIs..." -ForegroundColor Cyan
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com --quiet | Out-Null

$envLine = Get-Content "sage\.env" | Where-Object { $_ -match "^GOOGLE_API_KEY=" }
if (-not $envLine) {
    Write-Host "ERROR: GOOGLE_API_KEY not found in sage\.env" -ForegroundColor Red
    exit 1
}
$API_KEY = ($envLine -split "=", 2)[1].Trim('"').Trim("'")

if (-not (Test-Path $TOKEN_LOCAL_PATH)) {
    Write-Host "ERROR: Missing $TOKEN_LOCAL_PATH" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $CLIENT_SECRET_LOCAL_PATH)) {
    Write-Host "ERROR: Missing $CLIENT_SECRET_LOCAL_PATH" -ForegroundColor Red
    exit 1
}

Write-Host "  Gemini key and OAuth files found locally." -ForegroundColor Gray

Write-Host "`n==> [3/5] Syncing secrets to Secret Manager..." -ForegroundColor Cyan
Ensure-SecretFromText -SecretName $GEMINI_SECRET_NAME -SecretValue $API_KEY
Ensure-SecretFromFile -SecretName $TOKEN_SECRET_NAME -FilePath $TOKEN_LOCAL_PATH
Ensure-SecretFromFile -SecretName $CLIENT_SECRET_NAME -FilePath $CLIENT_SECRET_LOCAL_PATH

$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$RUNTIME_SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

foreach ($secretName in @($GEMINI_SECRET_NAME, $TOKEN_SECRET_NAME, $CLIENT_SECRET_NAME)) {
    gcloud secrets add-iam-policy-binding $secretName `
        --project $PROJECT_ID `
        --member "serviceAccount:$RUNTIME_SERVICE_ACCOUNT" `
        --role "roles/secretmanager.secretAccessor" | Out-Null
}

Write-Host "  Cloud Run runtime account can read mounted secrets." -ForegroundColor Gray

Write-Host "`n==> [4/5] Building container image..." -ForegroundColor Cyan
Push-Location "sage"
gcloud builds submit --tag $IMAGE --timeout=1200s .
Pop-Location

Write-Host "`n==> [5/5] Deploying to Cloud Run..." -ForegroundColor Cyan
Write-Host "  Checking for existing service..." -ForegroundColor Gray
$serviceExists = $true
try {
    gcloud run services describe $SERVICE --region $REGION --format=json *> $null
} catch {
    $serviceExists = $false
}

if ($serviceExists) {
    Write-Host "  Existing service found - deleting to avoid env-var type conflicts..." -ForegroundColor Yellow
    gcloud run services delete $SERVICE --region $REGION --quiet | Out-Null
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
    --set-env-vars "GOOGLE_GENAI_USE_VERTEXAI=false,USE_SQLITE=true,ENV=production,DEMO_MODE=true,DEMO_USE_LIVE_ENRICHMENT=false,GOOGLE_TOKEN_FILE=$TOKEN_MOUNT_PATH,GOOGLE_CREDENTIALS_FILE=$CLIENT_SECRET_MOUNT_PATH" `
    --update-secrets "GOOGLE_API_KEY=${GEMINI_SECRET_NAME}:latest,$TOKEN_MOUNT_PATH=${TOKEN_SECRET_NAME}:latest,$CLIENT_SECRET_MOUNT_PATH=${CLIENT_SECRET_NAME}:latest"

if ($LASTEXITCODE -ne 0) {
    Write-Host "`nERROR: Deploy failed. Check logs:" -ForegroundColor Red
    Write-Host "  gcloud run services describe $SERVICE --region $REGION" -ForegroundColor Red
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
    Write-Host "  FAILED - check service status:" -ForegroundColor Red
    Write-Host "  gcloud run services describe $SERVICE --region $REGION" -ForegroundColor Red
}
