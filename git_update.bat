@echo off
chcp 65001 >nul
title Git Auto Update

echo 🔄 Добавление файлов...
git add -A

echo 📝 Коммит с датой...
:: Получаем дату в формате ГГГГ-ММ-ДД
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set commit_date=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%

git commit -m "%commit_date%"

echo 🚀 Отправка на сервер...
git push

echo.
if %errorlevel% equ 0 (
    echo ✅ ВСЁ ГОТОВО! Успешно запушено.
) else (
    echo ❌ ОШИБКА! Проверьте вывод выше.
)

echo.
pause