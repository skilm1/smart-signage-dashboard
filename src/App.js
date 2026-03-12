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

      const [eventsRes, adsRes] = await Promise.all([
        fetch(EVENTS_API + "?t=" + Date.now(), { cache: "no-store" }),
        fetch(ADS_API + "?t=" + Date.now(), { cache: "no-store" })
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

    const timer = setInterval(loadData, 2000);

    return () => clearInterval(timer);

  }, []);

  const latest = events.length > 0 ? events[0] : null;

  const latestAd = ads.find(
    ad => ad.ad_id === latest?.selected_ad_id
  );

  const cameraImage = latest
    ? `https://elec0130-data.s3.eu-north-1.amazonaws.com/upload_photos/${latest.device_id}/latest.jpg?t=${Date.now()}`
    : null;

  const totalPeople = events.reduce(
    (sum, e) => sum + (e.person_count || 0),
    0
  );

  const timestamps = events.map(e => formatTime(e.ts));

  const peopleChart = {

    labels: timestamps,

    datasets: [

      {
        label: "People",
        data: events.map(e => e.person_count),
        borderColor: "#f59e0b"
      }

    ]

  };

  return (

    <div className="dashboard">

      <h1>SMART SIGNAGE AI SYSTEM</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <div className="stats">

        <div className="statCard">
          <div>Total People</div>
          <div className="statNumber">{totalPeople}</div>
        </div>

      </div>

      <div className="mainGrid">

        <div className="chart peopleTraffic">

          <h3>People Traffic</h3>

          <Line data={peopleChart}/>

        </div>

        <div className="card latestEvent">

          <h2>Latest Event</h2>

          {latest ? (

            <>

              <p>Device: {latest.device_id}</p>

              <p>Timestamp: {formatTime(latest.ts)}</p>

              <p>People: {latest.person_count}</p>

              <p>Faces: {latest.face_count}</p>

              <p>Average Age: {latest.age_mid_avg ?? "-"}</p>

              <h3>Camera Snapshot</h3>

              {cameraImage && (

                <img
                  src={cameraImage}
                  alt="camera"
                  className="cameraImage"
                />

              )}

              <h3>Selected Advertisement</h3>

              {latestAd && (

                <img
                  src={latestAd.asset_url}
                  alt="advertisement"
                  className="adImage"
                />

              )}

            </>

          ) : (

            <p>No data</p>

          )}

        </div>

      </div>

    </div>

  );

}

export default App;