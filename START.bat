@echo off

set file1=version.dat
set file2=package.json
set ver=0.0.0

if exist %file1% set /p ver=<%file1%

set verstr=\"version\"\: \"%ver%\"

findstr /ic:"%verstr%" %file2%>nul 2>&1
if errorlevel 1 (
 goto searchError
) else (
 goto searchSucces
)

:searchError
echo Updating and reinstalling npm packages...
npm i && node src/index.js
goto eof

:searchSucces
echo Starting script...
node src/index.js
