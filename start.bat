@echo off
echo ==========================================
echo       TZM CRM Tizimini Ishga Tushirish
echo ==========================================
echo.
echo 1. Backend paketlari o'rnatilmoqda...
cd server
call npm install
echo.
echo 2. Ma'lumotlar bazasi tayyorlanmoqda...
call npx prisma generate
call npx prisma db push
call npm run seed
echo.
echo 3. Backend server ishga tushirilmoqda...
start cmd /k "npm run dev"
echo.
echo 4. Frontend paketlari o'rnatilmoqda...
cd ../client
call npm install
echo.
echo 5. Frontend server ishga tushirilmoqda...
start cmd /k "npm run dev"
echo.
echo Barcha serverlar ishga tushirildi! Brauzer oynalari ochiladi...
timeout /t 5
start http://localhost:5173
exit
