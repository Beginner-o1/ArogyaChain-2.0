# PowerShell Script to Create GitHub Archive
# This creates a zip file ready for GitHub upload

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ArogyaChain GitHub Archive Creator" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get current directory
$sourceDir = Get-Location
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$archiveName = "arogyachain-$timestamp.zip"

Write-Host "Creating archive from: $sourceDir" -ForegroundColor Yellow
Write-Host "Archive name: $archiveName" -ForegroundColor Yellow
Write-Host ""

# Files and folders to exclude
$excludePatterns = @(
    "node_modules",
    ".git",
    "*.zip",
    "dist",
    "build",
    ".env",
    "cache",
    "artifacts/build-info",
    "artifacts/contracts"
)

Write-Host "Excluding:" -ForegroundColor Yellow
foreach ($pattern in $excludePatterns) {
    Write-Host "  - $pattern" -ForegroundColor Gray
}
Write-Host ""

# Create temporary directory for files to archive
$tempDir = Join-Path $env:TEMP "arogyachain-temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying files..." -ForegroundColor Yellow

# Copy all files except excluded ones
Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceDir.Path.Length + 1)
    
    # Check if file should be excluded
    $shouldExclude = $false
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $destPath = Join-Path $tempDir $relativePath
        $destDir = Split-Path $destPath -Parent
        
        if (-not (Test-Path $destDir)) {
            New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        }
        
        if ($_.PSIsContainer -eq $false) {
            Copy-Item $_.FullName -Destination $destPath -Force
        }
    }
}

Write-Host "Creating archive..." -ForegroundColor Yellow

# Create the archive
$archivePath = Join-Path $sourceDir $archiveName
Compress-Archive -Path "$tempDir\*" -DestinationPath $archivePath -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Archive Created Successfully!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archive location: $archivePath" -ForegroundColor Cyan
Write-Host "Archive size: $([math]::Round((Get-Item $archivePath).Length / 1MB, 2)) MB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to: https://github.com/Beginner-o1/ArogyaChain-2.0" -ForegroundColor White
Write-Host "2. Click 'Add file' -> 'Upload files'" -ForegroundColor White
Write-Host "3. Drag and drop: $archiveName" -ForegroundColor White
Write-Host "4. Add commit message and click 'Commit changes'" -ForegroundColor White
Write-Host ""
Write-Host "Or install Git for easier version control:" -ForegroundColor Yellow
Write-Host "https://git-scm.com/download/win" -ForegroundColor Cyan
Write-Host ""

# Open the folder containing the archive
Write-Host "Opening folder..." -ForegroundColor Yellow
Start-Process explorer.exe -ArgumentList "/select,`"$archivePath`""
