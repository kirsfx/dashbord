// ============================================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ============================================================
// Координаты текущего выбранного города.
// По умолчанию — Санкт-Петербург.
let currentCoords = { lat: 59.9386, lon: 30.3141 };
let currentCityName = 'Санкт-Петербург';

// Ссылки на элементы DOM
const cityInput   = document.querySelector('#city-input');
const searchBtn   = document.querySelector('#search-btn');
const cityStatus  = document.querySelector('#city-status');

// ============================================================
// ВИДЖЕТ 1: ПОГОДА (Open-Meteo Forecast API)
// ============================================================
// Документация: https://open-meteo.com/en/docs

const weatherNowEl   = document.querySelector('#weather-now');
const weatherTodayEl = document.querySelector('#weather-today');
const weatherMetaEl  = document.querySelector('#weather-meta');
const weatherRefresh = document.querySelector('#weather-refresh');

async function loadWeather() {
  weatherNowEl.textContent = 'Загрузка…';
  weatherTodayEl.textContent = '';
  weatherMetaEl.textContent = '';

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentCoords.lat}&longitude=${currentCoords.lon}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=1`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    const tempNow  = data.current?.temperature_2m;
    const windNow  = data.current?.wind_speed_10m;

    const tempMax  = data.daily?.temperature_2m_max?.[0];
    const tempMin  = data.daily?.temperature_2m_min?.[0];
    const rainProb = data.daily?.precipitation_probability_max?.[0];

    if (Number.isFinite(tempNow)) {
      weatherNowEl.textContent = `Сейчас: ${tempNow} °C, ветер ${windNow ?? '—'} км/ч`;
    } else {
      weatherNowEl.textContent = 'Сервис не вернул температуру.';
    }

    const todayParts = [];
    if (Number.isFinite(tempMax)) todayParts.push(`днём до ${tempMax}°`);
    if (Number.isFinite(tempMin)) todayParts.push(`ночью до ${tempMin}°`);
    if (Number.isFinite(rainProb)) todayParts.push(`вероятность дождя ${rainProb}%`);
    weatherTodayEl.textContent = todayParts.join(' · ');

    weatherMetaEl.textContent = `Источник: Open-Meteo · Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;

  } catch (error) {
    console.error('Ошибка загрузки погоды:', error);
    weatherNowEl.textContent = 'Не удалось загрузить погоду. Попробуйте ещё раз.';
    weatherMetaEl.textContent = 'Данные недоступны.';
  }
}

// ============================================================
// ВИДЖЕТ 2: ИНТЕРЕСНЫЕ МЕСТА (Overpass API)
// ============================================================
// Ищем достопримечательности, музеи, памятники, мемориалы, театры,
// кафе и парки в радиусе 800 м от текущих координат.
// Документация: https://wiki.openstreetmap.org/wiki/Overpass_API

const placesListEl  = document.querySelector('#places-list');
const placesMetaEl  = document.querySelector('#places-meta');
const placesRefresh = document.querySelector('#places-refresh');

// Определяем русское название категории по тегам OSM
function getPlaceType(tags) {
  if (tags.tourism === 'attraction') return 'достопримечательность';
  if (tags.tourism === 'museum')     return 'музей';
  if (tags.historic === 'monument')  return 'памятник';
  if (tags.historic === 'memorial')  return 'мемориал';
  if (tags.amenity === 'theatre')    return 'театр';
  if (tags.amenity === 'cafe')       return 'кафе';
  if (tags.leisure === 'park')       return 'парк';
  return 'место';
}

async function loadPlaces() {
  placesListEl.innerHTML = '<li>Загрузка…</li>';
  placesMetaEl.textContent = '';

  const query = `
    [out:json][timeout:15];
    (
      node["tourism"="attraction"](around:800,${currentCoords.lat},${currentCoords.lon});
      node["tourism"="museum"](around:800,${currentCoords.lat},${currentCoords.lon});
      node["historic"="monument"](around:800,${currentCoords.lat},${currentCoords.lon});
      node["historic"="memorial"](around:800,${currentCoords.lat},${currentCoords.lon});
      node["amenity"="theatre"](around:800,${currentCoords.lat},${currentCoords.lon});
      node["amenity"="cafe"](around:800,${currentCoords.lat},${currentCoords.lon});
      node["leisure"="park"](around:800,${currentCoords.lat},${currentCoords.lon});
    );
    out 20;
  `;

  const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    const elements = data.elements;

    if (!elements || elements.length === 0) {
      placesListEl.innerHTML = '<li>Рядом ничего не найдено. Попробуйте другой район или увеличьте радиус.</li>';
      placesMetaEl.textContent = `Источник: Overpass API · Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;
      return;
    }

    placesListEl.innerHTML = '';
    elements.forEach(place => {
      const name = place.tags?.name;
      if (!name) return;

      const type = getPlaceType(place.tags);

      const li = document.createElement('li');
      li.textContent = `${name} (${type})`;
      placesListEl.appendChild(li);
    });

    placesMetaEl.textContent = `Найдено мест: ${elements.length} · Источник: Overpass API · Обновлено: ${new Date().toLocaleTimeString('ru-RU')}`;

  } catch (error) {
    console.error('Ошибка загрузки мест:', error);
    placesListEl.innerHTML = '<li>Не удалось загрузить места. Попробуйте ещё раз.</li>';
    placesMetaEl.textContent = 'Данные недоступны.';
  }
}

// ============================================================
// ВИДЖЕТ 3: ЗАМЕТКИ / МАРШРУТ (локальный, localStorage)
// ============================================================

const noteForm  = document.querySelector('#note-form');
const noteInput = document.querySelector('#note-input');
const notesList = document.querySelector('#notes-list');
const notesMeta = document.querySelector('#notes-meta');

let notes = JSON.parse(localStorage.getItem('city-walk-notes') || '[]');

function renderNotes() {
  notesList.innerHTML = '';
  if (notes.length === 0) {
    notesList.innerHTML = '<li>Пока пусто. Добавь первую точку маршрута.</li>';
    notesMeta.textContent = '';
    return;
  }
  notes.forEach((note, index) => {
    const li = document.createElement('li');

    const span = document.createElement('span');
    span.textContent = note;

    const btn = document.createElement('button');
    btn.className = 'delete-note';
    btn.type = 'button';
    btn.textContent = '×';
    btn.setAttribute('aria-label', `Удалить заметку: ${note}`);
    btn.addEventListener('click', () => {
      notes.splice(index, 1);
      localStorage.setItem('city-walk-notes', JSON.stringify(notes));
      renderNotes();
    });

    li.appendChild(span);
    li.appendChild(btn);
    notesList.appendChild(li);
  });
  notesMeta.textContent = `Заметок: ${notes.length}`;
}

noteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = noteInput.value.trim();
  if (!text) return;
  notes.push(text);
  localStorage.setItem('city-walk-notes', JSON.stringify(notes));
  noteInput.value = '';
  renderNotes();
});

// ============================================================
// ГЕОКОДИНГ: выбор города через Open-Meteo Geocoding API
// ============================================================
// Документация: https://open-meteo.com/en/docs/geocoding-api

async function searchCity() {
  const query = cityInput.value.trim();
  if (!query) {
    cityStatus.textContent = 'Введите название города.';
    return;
  }

  cityStatus.textContent = 'Поиск города…';

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=ru`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      cityStatus.textContent = 'Город не найден. Попробуйте другое название.';
      return;
    }

    const city = data.results[0];
    currentCoords = { lat: city.latitude, lon: city.longitude };
    currentCityName = city.name;
    cityStatus.textContent = `Выбран: ${city.name}, ${city.country}`;

    loadWeather();
    loadPlaces();

  } catch (error) {
    console.error('Ошибка поиска города:', error);
    cityStatus.textContent = 'Не удалось найти город. Проверьте подключение.';
  }
}

// ============================================================
// ОБРАБОТЧИКИ СОБЫТИЙ
// ============================================================

searchBtn.addEventListener('click', searchCity);
cityInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') searchCity();
});

weatherRefresh.addEventListener('click', loadWeather);
placesRefresh.addEventListener('click', loadPlaces);

// ============================================================
// СТАРТ
// ============================================================
renderNotes();
loadWeather();
loadPlaces();