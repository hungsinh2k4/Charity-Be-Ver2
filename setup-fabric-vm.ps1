# setup-fabric-vm.ps1 - Tự động tạo VM ở zone khả dụng và setup Fabric

param(
    [string]$VM_NAME = "fabric-vm",
    [string]$MACHINE_TYPE = "e2-standard-4",
    [string]$ZONE_PREFERRED = "asia-southeast1-b",
    [string]$IMAGE_FAMILY = "debian-12",
    [string]$IMAGE_PROJECT = "debian-cloud",
    [int]$DISK_SIZE_GB = 50
)

$PROJECT = "charity-system-493701"
$ZONES = @("asia-southeast1-b", "asia-southeast1-a", "asia-southeast1-c")

function Get-VMStatus {
    param([string]$Name, [string]$Zone)
    $status = gcloud compute instances describe $Name --zone=$Zone --project=$PROJECT 2>$null | Select-String "status:"
    if ($status) { return $status.ToString().Split(":")[-1].Trim() }
    return $null
}

function Test-VMReachable {
    param([string]$IP)
    if (-not $IP) { return $false }
    $result = Test-Connection -ComputerName $IP -Count 2 -Quiet -ErrorAction SilentlyContinue
    return $result
}

Write-Host "=== Fabric VM Setup Script ===" -ForegroundColor Cyan

# 1. Tìm VM đang chạy hoặc tạo mới
$runningVM = $null
$runningZone = $null
$runningIP = $null

foreach ($zone in $ZONES) {
    Write-Host "Checking $VM_NAME in $zone..." -NoNewline
    $status = Get-VMStatus -Name $VM_NAME -Zone $zone
    if ($status -eq "RUNNING") {
        Write-Host " RUNNING" -ForegroundColor Green
        # Lấy IP
        $ipLine = gcloud compute instances describe $VM_NAME --zone=$zone --project=$PROJECT 2>$null | Select-String "natIP:"
        if ($ipLine) {
            $runningIP = $ipLine.ToString().Split(":")[-1].Trim()
        }
        $runningVM = $VM_NAME
        $runningZone = $zone
        break
    } elseif ($status -eq "TERMINATED") {
        Write-Host " TERMINATED - will try to start" -ForegroundColor Yellow
        $start = gcloud compute instances start $VM_NAME --zone=$zone --project=$PROJECT 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " Started successfully!" -ForegroundColor Green
            $runningVM = $VM_NAME
            $runningZone = $zone
            Start-Sleep -Seconds 5
            $ipLine = gcloud compute instances describe $VM_NAME --zone=$zone --project=$PROJECT 2>$null | Select-String "natIP:"
            if ($ipLine) {
                $runningIP = $ipLine.ToString().Split(":")[-1].Trim()
            }
            break
        } else {
            Write-Host " Failed to start: ZONE_RESOURCE_POOL_EXHAUSTED" -ForegroundColor Red
        }
    } else {
        Write-Host " Not found or $status" -ForegroundColor Gray
    }
}

# 2. Nếu không có VM nào chạy được, tạo VM mới ở zone khác
if (-not $runningVM) {
    Write-Host "`nNo existing VM available. Creating new VM..." -ForegroundColor Yellow
    $newName = "$VM_NAME-new"

    foreach ($zone in $ZONES) {
        Write-Host "Trying zone $zone..." -NoNewline
        $result = gcloud compute instances create $newName `
            --zone=$zone `
            --machine-type=$MACHINE_TYPE `
            --image-family=$IMAGE_FAMILY `
            --image-project=$IMAGE_PROJECT `
            --boot-disk-size=${DISK_SIZE_GB}GB `
            --boot-disk-type=pd-ssd `
            --tags=http-server,https-server `
            --project=$PROJECT 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host " Created!" -ForegroundColor Green
            $runningVM = $newName
            $runningZone = $zone
            Start-Sleep -Seconds 10
            $ipLine = $result | Select-String "natIP:"
            if ($ipLine) {
                $runningIP = $ipLine.ToString().Split(":")[-1].Trim()
            }
            break
        } else {
            Write-Host " Failed" -ForegroundColor Red
        }
    }
}

if (-not $runningVM -or -not $runningIP) {
    Write-Host "ERROR: Could not get or create any VM!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== Fabric VM Info ===" -ForegroundColor Cyan
Write-Host "Name: $runningVM"
Write-Host "Zone: $runningZone"
Write-Host "IP:   $runningIP"

# 3. Chờ VM fully ready
Write-Host "`nWaiting for VM to be reachable..." -NoNewline
$retry = 0
while (-not (Test-VMReachable -IP $runningIP) -and $retry -lt 30) {
    Start-Sleep -Seconds 5
    $retry++
    Write-Host "." -NoNewline
}
if ($retry -ge 30) {
    Write-Host " WARNING: VM may not be fully ready yet" -ForegroundColor Yellow
} else {
    Write-Host " Reachable!" -ForegroundColor Green
}

# 4. Update deploy-prod.ps1 with new IP
Write-Host "`nUpdating deploy-prod.ps1 with FABRIC_VM_IP=$runningIP..." -ForegroundColor Cyan
$deployScript = Get-Content "deploy-prod.ps1" -Raw
$deployScript = $deployScript -replace "--set-env-vars FABRIC_VM_IP=\d+\.\d+\.\d+\.\d+", "--set-env-vars FABRIC_VM_IP=$runningIP"
Set-Content -Path "deploy-prod.ps1" -Value $deployScript

Write-Host "`n=== Done ===" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "  1. SSH to VM: gcloud compute ssh $runningVM --zone=$runningZone --project=$PROJECT"
Write-Host "  2. Setup Fabric on the VM (if new VM)"
Write-Host "  3. Run: .\deploy-prod.ps1"
