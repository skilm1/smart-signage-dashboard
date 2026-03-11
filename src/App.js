import "./App.css";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  ArcElement,
  BarElement
} from "chart.js";

import { Line, Pie, Bar } from "react-chartjs-2";

ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip,
  ArcElement,
  BarElement
);

function formatTime(ts) {
  if (!ts) return "-";
  const date = new Date(ts * 1000);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

function parseApiArray(data) {
  if (Array.isArray(data)) return data;

  if (data && Array.isArray(data.items)) return data.items;

  if (data && typeof data.body === "string") {
    try {
      const parsed = JSON.parse(data.body);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeGenderCounts(genderCounts, fallbackGender) {
  const result = { male: 0, female: 0 };

  if (genderCounts && typeof genderCounts === "object") {
    Object.entries(genderCounts).forEach(([key, value]) => {
      const k = String(key).toLowerCase();
      const v = Number(value) || 0;

      if (k === "male") result.male += v;
      if (k === "female") result.female += v;
    });
  }

  if (result.male === 0 && result.female === 0 && fallbackGender) {
    const g = String(fallbackGender).toLowerCase();
    if (g === "male") result.male = 1;
    if (g === "female") result.female = 1;
  }

  return result;
}

function getAgeBucketIndex(age) {
  const n = Number(age);
  if (!Number.isFinite(n)) return -1;
  if (n < 18) return 0;
  if (n < 25) return 1;
  if (n < 40) return 2;
  return 3;
}

function normalizeEvent(raw) {
  return {
    device_id: raw.device_id ?? "-",
    ts: Number(raw.ts) || 0,
    person_count: Number(raw.person_count) || 0,
    face_count: Number(raw.face_count) || 0,

    age_mid_avg:
      raw.age_mid_avg !== null && raw.age_mid_avg !== undefined
        ? Number(raw.age_mid_avg)
        : null,

    gender_majority: raw.gender_majority ?? "-",
    gender_counts: raw.gender_counts ?? {},

    group_type: raw.group_type ?? "-",
    selected_ad_id: raw.selected_ad_id ?? "-",

    temp: raw.temp ?? raw.temperature ?? null,
    hum: raw.hum ?? raw.humidity ?? null
  };
}

function App() {
  const [events, setEvents] = useState([]);
  const [ads, setAds] = useState([]);
  const [error, setError] = useState("");

  const EVENTS_API =
    "https://dj7r6jv7tk.execute-api.eu-north-1.amazonaws.com/events";
  const ADS_API =
    "https://dj7r6jv7tk.execute-api.eu-north-1.amazonaws.com/ads";

  const loadData = async () => {
    try {
      setError("");

      const [eventsRes, adsRes] = await Promise.all([
        fetch(EVENTS_API),
        fetch(ADS_API)
      ]);

      const eventsJson = await eventsRes.json();
      const adsJson = await adsRes.json();

      const rawEvents = parseApiArray(eventsJson);
      const rawAds = parseApiArray(adsJson);

      const normalizedEvents = rawEvents
        .map(normalizeEvent)
        .sort((a, b) => b.ts - a.ts);

      setEvents(normalizedEvents);
      setAds(rawAds);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const latest = events.length > 0 ? events[0] : null;

  /* =========================
     DASHBOARD STATISTICS
  ==========================*/

  const totalPeople = events.reduce(
    (sum, e) => sum + (e.person_count || 0),
    0
  );

  const validTemps = events.filter(e => e.temp !== null);
  const avgTemp =
    validTemps.length > 0
      ? validTemps.reduce((sum, e) => sum + Number(e.temp), 0) /
        validTemps.length
      : null;

  const validHum = events.filter(e => e.hum !== null);
  const avgHum =
    validHum.length > 0
      ? validHum.reduce((sum, e) => sum + Number(e.hum), 0) /
        validHum.length
      : null;

  const validAge = events.filter(e => e.age_mid_avg !== null);
  const avgAge =
    validAge.length > 0
      ? validAge.reduce((sum, e) => sum + Number(e.age_mid_avg), 0) /
        validAge.length
      : null;

  /* =========================
        CHART DATA
  ==========================*/

  const timestamps = events.map(e => formatTime(e.ts));
  const temperatures = events.map(e => e.temp);
  const humidity = events.map(e => e.hum);
  const peopleCounts = events.map(e => e.person_count);

  const temperatureChart = {
    labels: timestamps,
    datasets: [
      {
        label: "Temperature",
        data: temperatures,
        borderColor: "#38bdf8",
        tension: 0.3
      }
    ]
  };

  const humidityChart = {
    labels: timestamps,
    datasets: [
      {
        label: "Humidity",
        data: humidity,
        borderColor: "#22c55e",
        tension: 0.3
      }
    ]
  };

  const peopleChart = {
    labels: timestamps,
    datasets: [
      {
        label: "People",
        data: peopleCounts,
        borderColor: "#f59e0b",
        tension: 0.3
      }
    ]
  };

  let male = 0;
  let female = 0;

  events.forEach(e => {
    const counts = normalizeGenderCounts(
      e.gender_counts,
      e.gender_majority
    );
    male += counts.male;
    female += counts.female;
  });

  const genderChart = {
    labels: ["Male", "Female"],
    datasets: [
      {
        data: [male, female],
        backgroundColor: ["#3b82f6", "#ec4899"]
      }
    ]
  };

  const ageGroups = [0, 0, 0, 0];

  events.forEach(e => {
    const idx = getAgeBucketIndex(e.age_mid_avg);
    if (idx >= 0) ageGroups[idx]++;
  });

  const ageChart = {
    labels: ["<18", "18-25", "25-40", "40+"],
    datasets: [
      {
        label: "Age Distribution",
        data: ageGroups,
        backgroundColor: "#22c55e"
      }
    ]
  };

  const adCounts = {};

  events.forEach(e => {
    const id = e.selected_ad_id;
    if (id && id !== "-") {
      adCounts[id] = (adCounts[id] || 0) + 1;
    }
  });

  const adChart = {
    labels: Object.keys(adCounts),
    datasets: [
      {
        label: "Ad Triggers",
        data: Object.values(adCounts),
        backgroundColor: "#f97316"
      }
    ]
  };

  const latestGenderCounts = latest
    ? normalizeGenderCounts(
        latest.gender_counts,
        latest.gender_majority
      )
    : { male: 0, female: 0 };

  return (
    <div className="dashboard">

      <h1>SMART SIGNAGE AI SYSTEM</h1>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div className="stats">

        <div className="statCard">
          <div>Total People</div>
          <div className="statNumber">{totalPeople}</div>
        </div>

        <div className="statCard">
          <div>Avg Age</div>
          <div className="statNumber">
            {avgAge !== null ? avgAge.toFixed(1) : "-"}
          </div>
        </div>

        <div className="statCard">
          <div>Avg Temp</div>
          <div className="statNumber">
            {avgTemp !== null ? avgTemp.toFixed(1) : "--"}°
          </div>
        </div>

        <div className="statCard">
          <div>Avg Humidity</div>
          <div className="statNumber">
            {avgHum !== null ? avgHum.toFixed(1) : "--"}%
          </div>
        </div>

      </div>

      <div className="grid">

        <div className="card">

          <h2>Latest Event</h2>

          {latest ? (
            <>
              <p>Device: {latest.device_id}</p>
              <p>Timestamp: {formatTime(latest.ts)}</p>
              <p>People: {latest.person_count}</p>
              <p>Faces: {latest.face_count}</p>
              <p>Average Age: {latest.age_mid_avg ?? "-"}</p>

              <p>
                Gender Counts: Male {latestGenderCounts.male} /
                Female {latestGenderCounts.female}
              </p>

              <p>Group: {latest.group_type ?? "-"}</p>
              <p>Ad: {latest.selected_ad_id ?? "-"}</p>
            </>
          ) : (
            <p>No data</p>
          )}

        </div>

        <div className="card">

          <h2>Ad Rules</h2>

          <table>

            <thead>
              <tr>
                <th>Ad</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Count</th>
                <th>Priority</th>
              </tr>
            </thead>

            <tbody>

              {ads.map(ad => (
                <tr key={ad.ad_id}>
                  <td>{ad.ad_id}</td>
                  <td>{ad.gender ?? "-"}</td>
                  <td>{ad.age_min ?? "-"}-{ad.age_max ?? "-"}</td>
                  <td>{ad.min_count ?? "-"}-{ad.max_count ?? "-"}</td>
                  <td>{ad.priority ?? "-"}</td>
                </tr>
              ))}

            </tbody>

          </table>

        </div>

      </div>

      <div className="chartsGrid">

        <div className="chart">
          <h3>People Traffic</h3>
          <Line data={peopleChart} />
        </div>

        <div className="chart">
          <h3>Temperature</h3>
          <Line data={temperatureChart} />
        </div>

        <div className="chart">
          <h3>Humidity</h3>
          <Line data={humidityChart} />
        </div>

      </div>

      <div className="chartsGrid">

        <div className="chart">
          <h3>Gender Distribution</h3>
          <Pie data={genderChart} />
        </div>

        <div className="chart">
          <h3>Age Distribution</h3>
          <Bar data={ageChart} />
        </div>

      </div>

      <div className="chart">

        <h3>Ad Trigger Analytics</h3>
        <Bar data={adChart} />

      </div>

      <div className="card" style={{ marginTop: "20px" }}>

        <h2>Recent Events</h2>

        <table>

          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device</th>
              <th>People</th>
              <th>Faces</th>
              <th>Average Age</th>
              <th>Temp</th>
              <th>Humidity</th>
              <th>Ad</th>
            </tr>
          </thead>

          <tbody>

            {events.slice(0, 20).map((e, idx) => (

              <tr key={idx}>
                <td>{formatTime(e.ts)}</td>
                <td>{e.device_id}</td>
                <td>{e.person_count}</td>
                <td>{e.face_count}</td>
                <td>{e.age_mid_avg ?? "-"}</td>
                <td>{e.temp ?? "-"}</td>
                <td>{e.hum ?? "-"}</td>
                <td>{e.selected_ad_id ?? "-"}</td>
              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default App;