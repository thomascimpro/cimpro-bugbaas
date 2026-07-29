$ErrorActionPreference = "Stop"

$pythonScript = Join-Path $PSScriptRoot "convert_bugdex_to_webp.py"

if (-not (Test-Path $pythonScript)) {
    throw "Python-script niet gevonden: $pythonScript"
}

python -c "import PIL" 2>$null
if ($LASTEXITCODE -ne 0) {
    throw "Pillow ontbreekt. Installeer eerst: py -m pip install Pillow"
}

python $pythonScript
if ($LASTEXITCODE -ne 0) {
    throw "BugDex-conversie is mislukt. Zie de reden hierboven."
}
