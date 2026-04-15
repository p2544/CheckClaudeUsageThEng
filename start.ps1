while ((Get-Process "node" -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -match "pnpm"} | Measure-Object).Count -gt 0) {
    Start-Sleep -Seconds 5
}
pnpm install
pnpm sync
Start-Process "http://localhost:3000"
pnpm dev
