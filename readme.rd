# Прогулка по городу — дашборд

**Тема:** Прогулка по городу
**Пользователь:** Городской житель или турист, планирующий прогулку
**Задача панели:** За один экран показать погоду, интересные места рядом и дать возможность записать свой маршрут

## Виджеты
1. **Погода** — Open-Meteo Forecast API (текущая температура, ветер, прогноз на день)
2. **Что рядом** — Overpass API / OpenStreetMap (достопримечательности, музеи, памятники, мемориалы, театры, кафе, парки в радиусе 800 м)
3. **Мой маршрут** — локальный виджет с сохранением в localStorage

## API

| API | Документация | Что используем |
|---|---|---|
| Open-Meteo Forecast | https://open-meteo.com/en/docs | `current.temperature_2m`, `current.wind_speed_10m`, `daily.temperature_2m_max`, `daily.temperature_2m_min`, `daily.precipitation_probability_max` |
| Open-Meteo Geocoding | https://open-meteo.com/en/docs/geocoding-api | `results[0].latitude`, `results[0].longitude` |
| Overpass API | https://wiki.openstreetmap.org/wiki/Overpass_API | `elements[].tags.name`, `elements[].tags.tourism`, `elements[].tags.historic`, `elements[].tags.amenity`, `elements[].tags.leisure` |

**Пример запроса погоды:**
https://api.open-meteo.com/v1/forecast?latitude=59.94&longitude=30.31&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1

**Пример запроса мест (Overpass QL):**
[out:json][timeout:15];
(
node"tourism"="attraction";
node"tourism"="museum";
node"historic"="monument";
node"historic"="memorial";
node"amenity"="theatre";
node"amenity"="cafe";
node"leisure"="park";
);
out 20;

## Ограничения
- Overpass API — публичный бесплатный сервис, может быть перегружен. При ошибке показываем сообщение и кнопку «Обновить».
- Open-Meteo — лимит 10 000 запросов в день для некоммерческого использования.
- Радиус поиска мест — 800 метров (можно увеличить в коде).
- Курсы валют не используются, данные не являются котировками в реальном времени.

## Результаты проверок
- [ ] Ширина 360px — одна колонка
- [ ] Ширина 768px — две колонки
- [ ] Ширина 1280px — две колонки, заметки на всю ширину
- [ ] Отключение сети — виджеты показывают ошибку, панель не ломается
- [ ] Пустой поиск города — понятное сообщение
- [ ] Кнопка «Обновить» повторяет запрос
- [ ] Увеличение текста 200% — вёрстка не ломается

## Применение ИИ
Код написан с помощью AI-ассистента (deepseek). Проверен вручную: запущен локально, протестированы оба API, проверены состояния загрузки/ошибки/пустого результата.
