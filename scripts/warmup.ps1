# Warm-up Next.js dev routes after server is Ready.
# Why: Next dev compiles on demand -- first hit per route costs 3-15s.
# Fire curl before manual testing so routes are pre-compiled in Turbopack RAM.
#
# Usage (after `npm run dev` shows Ready):
#   ./scripts/warmup.ps1
# Override base URL:
#   $env:WARMUP_BASE='http://localhost:3001'; ./scripts/warmup.ps1

$BASE = if ($env:WARMUP_BASE) { $env:WARMUP_BASE } else { 'http://localhost:3000' }

# Routes you hit often. Add/remove to match your workflow.
# Private routes still warm because middleware redirect compiles target too.
$ROUTES = @(
  '/vi',
  '/vi/home',
  '/vi/admin/service-type',
  '/vi/admin/order',
  '/vi/products',
  '/vi/orders',
  '/api/auth/session'
)

Write-Host "Warming up Next.js dev at $BASE ..." -ForegroundColor Cyan
Write-Host "(first hit per route is the slow one - that is the point)" -ForegroundColor DarkGray

$total = [System.Diagnostics.Stopwatch]::StartNew()
foreach ($route in $ROUTES) {
  $url = "$BASE$route"
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $code = '---'
  try {
    $resp = Invoke-WebRequest -Uri $url -Method GET -MaximumRedirection 0 -UseBasicParsing -TimeoutSec 60 -ErrorAction Stop
    $code = [int]$resp.StatusCode
  } catch {
    if ($_.Exception.Response) {
      $code = [int]$_.Exception.Response.StatusCode
    } else {
      $code = 'ERR'
    }
  }
  $sw.Stop()
  $ms = $sw.ElapsedMilliseconds
  $color = if ($ms -lt 1000) { 'Green' } elseif ($ms -lt 5000) { 'Yellow' } else { 'Red' }
  Write-Host ("  {0,6}ms  [{1}]  {2}" -f $ms, $code, $route) -ForegroundColor $color
}
$total.Stop()
Write-Host ("Done in {0:N1}s. Routes are now compiled in Turbopack RAM." -f $total.Elapsed.TotalSeconds) -ForegroundColor Cyan
Write-Host "Open browser to test - pages should load instantly (only API latency)." -ForegroundColor DarkGray
