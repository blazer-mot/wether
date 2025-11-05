const API_KEY = "3267f0cb6bcc4c888f21531c96fefa6b";
const API_URL = "https://api.weatherbit.io/v2.0/current";

const CITIES = [
  { name: "Минск", lat: 53.9, lon: 27.5667 },
  { name: "Москва", lat: 55.7558, lon: 37.6173 },
  { name: "Париж", lat: 48.8566, lon: 2.3522 },
  { name: "Нью-Йорк", lat: 40.7128, lon: -74.006 },
  { name: "Лондон", lat: 51.5074, lon: -0.1278 },
  { name: "Берлин", lat: 52.52, lon: 13.405 },
  { name: "Мадрид", lat: 40.4168, lon: -3.7038 },
  { name: "Рим", lat: 41.9028, lon: 12.4964 },
  { name: "Токио", lat: 35.6762, lon: 139.6503 },
  { name: "Пекин", lat: 39.9042, lon: 116.4074 }
];

const qs = (id) => document.getElementById(id);
const setTheme = (theme) => {
  document.documentElement.className = `theme-${theme}`;
};

function showError(msg) {
  const box = qs("errorBox");
  box.textContent = `Ошибка: ${msg}`;
  box.style.display = "block";
}
function clearError() {
  const box = qs("errorBox");
  box.style.display = "none";
  box.textContent = "";
}

function setLoading(isLoading) {
  const btn = document.querySelector(".btn.primary");
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Загружаем..." : "Показать погоду";
}

function showWeather(data) {
  qs("weatherCard").style.display = "block";
  qs("cityName").textContent = data.city;
  qs("temp").textContent = `${Math.round(data.temp)}°C`;
  qs("weatherDesc").textContent = data.desc;

  const iconUrl = data.icon
    ? `https://www.weatherbit.io/static/img/icons/${data.icon}.png`
    : "";
  const img = qs("weatherIcon");
  if (iconUrl) {
    img.src = iconUrl;
    img.alt = data.desc || "Погода";
    img.style.display = "block";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
  }

  const isNight = typeof data.icon === "string" && /n$/.test(data.icon);
  const finalTheme = isNight ? "night" : data.theme;
  setTheme(finalTheme);
}

function validateCoords(latStr, lonStr) {
  const lat = parseFloat(latStr);
  const lon = parseFloat(lonStr);
  if (!isFinite(lat) || !isFinite(lon)) {
    return { ok: false, msg: "Введите числовые координаты." };
  }
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return { ok: false, msg: "Широта: -90..90, долгота: -180..180." };
  }
  return { ok: true, lat, lon };
}

function classifyCondition(code, desc = "") {
  if (code === 800) return "clear";                 
  if (code === 801 || code === 802) return "mostlyclear"; 
  if (code >= 803 && code <= 804) return "clouds"; 

  if (code >= 200 && code <= 233) return "thunder"; 
  if (code >= 300 && code <= 302) return "drizzle";
  if (code >= 500 && code <= 522) return "rain"; 
  if (code >= 600 && code <= 623) return "snow";    

  if (code >= 700 && code <= 751) return "fog";     

  const t = (desc || "").toLowerCase();
  if (t.includes("гроза") || t.includes("шторм")) return "thunder";
  if (t.includes("морось")) return "drizzle";
  if (t.includes("дожд")) return "rain";
  if (t.includes("снег")) return "snow";
  if (t.includes("туман") || t.includes("дымк")) return "fog";
  if (t.includes("ясно")) return "clear";
  if (t.includes("облач")) return "clouds";
  return "windy";
}

async function fetchWeather(lat, lon) {
  const url = `${API_URL}?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&key=${encodeURIComponent(API_KEY)}&lang=ru`;

  const resp = await fetch(url, { method: "GET" });
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`);
  }

  const json = await resp.json();
  if (!json.data || !json.data.length) {
    throw new Error("Пустой ответ API");
  }

  const item = json.data[0];
  const payload = {
    city: item.city_name || "Неизвестно",
    temp: item.temp,
    desc: item.weather?.description || "—",
    icon: item.weather?.icon || null,
    code: item.weather?.code ?? null
  };

  payload.theme = classifyCondition(payload.code, payload.desc);
  return payload;
}

function renderCityButtons() {
  const grid = qs("cityGrid");
  grid.innerHTML = "";

  CITIES.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "btn city-btn";
    btn.type = "button";
    btn.textContent = c.name;
    btn.addEventListener("click", async () => {
      clearError();
      setLoading(true);
      try {
        const data = await fetchWeather(c.lat, c.lon);
        showWeather(data);
      } catch (e) {
        showError("Ошибка сети или API. Попробуйте позже.");
      } finally {
        setLoading(false);
      }
    });
    grid.appendChild(btn);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderCityButtons();

  const form = qs("coordForm");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearError();
    setLoading(true);

    const latStr = qs("lat").value.trim();
    const lonStr = qs("lon").value.trim();
    const v = validateCoords(latStr, lonStr);

    if (!v.ok) {
      setLoading(false);
      showError(v.msg);
      return;
    }

    try {
      const data = await fetchWeather(v.lat, v.lon);
      showWeather(data);
    } catch (err) {
      if (String(err.message).startsWith("HTTP")) {
        showError("Неверные координаты или ошибка запроса.");
      } else {
        showError("Ошибка сети или API. Попробуйте позже.");
      }
    } finally {
      setLoading(false);
    }
  });
});
