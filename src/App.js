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
  const [shadowAd, setShadowAd] = useState(null);
  const [controlMsg, setControlMsg] = useState("");
  const [sendingAdId, setSendingAdId] = useState("");

  const EVENTS_API =
    "https://dj7r6jv7tk.execute-api.eu-north-1.amazonaws.com/events";

  const ADS_API =
    "https://dj7r6jv7tk.execute-api.eu-north-1.amazonaws.com/ads";
  const SHADOW_AD_API =
    "https://sej6ilgsac3iaogdemhysilenu0ckwjj.lambda-url.eu-north-1.on.aws/";
  const CONTROL_API =
    "https://vsz5sjj3nbbfe5zmj2im73pax40zcevm.lambda-url.eu-north-1.on.aws/";
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

  const loadLatestAdFromShadow = async () => {

  try {

    const res = await fetch(
      SHADOW_AD_API + "?t=" + Date.now(),
      { cache: "no-store" }
    );

    if (!res.ok) {
      throw new Error("shadow api failed: " + res.status);
    }

    const data = await res.json();

    console.log("shadow ad:", data);

    setShadowAd(data);

  } catch (err) {

    console.log("shadow fetch error", err);

  }

};
const forceAdToScreen = async (ad) => {

  try {

    setSendingAdId(ad.ad_id);
    setControlMsg("");

    const payload = {
      ad_id: ad.ad_id,
      duration_sec: Number(ad.duration_sec || 15),
      asset_url: ad.asset_url || "",
      manual_override: true
    };

    const res = await fetch(CONTROL_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Failed to push ad");
    }

    setControlMsg("Ad pushed to screen: " + ad.ad_id);

  } catch (err) {

    setControlMsg("Push failed: " + err);

  } finally {

    setSendingAdId("");

  }

};

 useEffect(() => {
    loadData();
    

    const timer = setInterval(() => {
      loadData();
      
    }, 4000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadLatestAdFromShadow();

    const timer = setInterval(() => {
      loadLatestAdFromShadow();
    }, 1000);

    return () => clearInterval(timer);
  }, []);

const latest = events.length > 0 ? events[0] : null;
const currentAd = shadowAd;

  const totalPeople = events.reduce(
    (sum, e) => sum + (e.person_count || 0),
    0
  );


  const validTemps = events.filter(e => e.temp !== null);

  const avgTemp =
    validTemps.length > 0
      ? validTemps.reduce((s, e) => s + Number(e.temp), 0) /
        validTemps.length
      : null;


  const validHum = events.filter(e => e.hum !== null);

  const avgHum =
    validHum.length > 0
      ? validHum.reduce((s, e) => s + Number(e.hum), 0) /
        validHum.length
      : null;


  const validAge = events.filter(e => e.age_mid_avg !== null);

  const avgAge =
    validAge.length > 0
      ? validAge.reduce((s, e) => s + Number(e.age_mid_avg), 0) /
        validAge.length
      : null;


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


  const temperatureChart = {
    labels: timestamps,
    datasets: [
      {
        label: "Temperature",
        data: events.map(e => e.temp),
        borderColor: "#38bdf8"
      }
    ]
  };


  const humidityChart = {
    labels: timestamps,
    datasets: [
      {
        label: "Humidity",
        data: events.map(e => e.hum),
        borderColor: "#22c55e"
      }
    ]
  };


  let male = 0;
  let female = 0;

  events.forEach(e => {

    const c = normalizeGenderCounts(
      e.gender_counts,
      e.gender_majority
    );

    male += c.male;
    female += c.female;

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

    {error && <p style={{ color: "red" }}>{error}</p>}

    {/* Stats */}

    <div className="stats">

      <div className="statCard">
        <div>Total People</div>
        <div className="statNumber">{totalPeople}</div>
      </div>

      <div className="statCard">
        <div>Avg Age</div>
        <div className="statNumber">
          {avgAge ? avgAge.toFixed(1) : "-"}
        </div>
      </div>

      <div className="statCard">
        <div>Avg Temp</div>
        <div className="statNumber">
          {avgTemp ? avgTemp.toFixed(1) : "--"}°
        </div>
      </div>

      <div className="statCard">
        <div>Avg Humidity</div>
        <div className="statNumber">
          {avgHum ? avgHum.toFixed(1) : "--"}%
        </div>
      </div>

    </div>


    {/* Main Grid */}

    <div className="mainGrid">

      <div className="chart peopleTraffic">
        <h3>People Traffic</h3>
        <Line data={peopleChart}/>
      </div>

      <div className="chart genderChart">
        <h3>Gender Distribution</h3>
        <Pie data={genderChart}/>
      </div>

      <div className="chart temperatureChart">
        <h3>Temperature</h3>
        <Line data={temperatureChart}/>
      </div>

      <div className="chart humidityChart">
        <h3>Humidity</h3>
        <Line data={humidityChart}/>
      </div>

      <div className="chart ageChart">
        <h3>Age Distribution</h3>
        <Bar data={ageChart}/>
      </div>

      <div className="chart adTriggerChart">
        <h3>Ad Trigger Analytics</h3>
        <Bar data={adChart}/>
      </div>


      {/* Latest Event */}

      <div className="card latestEvent">

        <h2>Latest Event</h2>

        {latest ? (

          <>

            <p>Device: {latest.device_id}</p>

            <p>Timestamp: {formatTime(latest.ts)}</p>

            <p>People: {latest.person_count}</p>

            <p>Faces: {latest.face_count}</p>

            <p>Average Age: {latest.age_mid_avg ?? "-"}</p>

            <p>
              Gender Counts:
              Male {latestGenderCounts.male} /
              Female {latestGenderCounts.female}
            </p>

            <p>Group: {latest.group_type}</p>

            <p>Ad: {latest.selected_ad_id}</p>

          </>

        ) : (

          <p>No data</p>

        )}

      </div>


      {/* Recent Events */}

      <div className="card recentEvents">

        <h2>Recent Events</h2>

        <table>

          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device</th>
              <th>People</th>
              <th>Faces</th>
              <th>Age</th>
              <th>Temp</th>
              <th>Humidity</th>
              <th>Ad</th>
            </tr>
          </thead>

          <tbody>

            {events.slice(0,20).map((e,idx)=>(

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


        {/* Current Advertisement 保持在 Recent Events 内 */}

        {currentAd && currentAd.asset_url && (

          <div className="adDisplay">

            <h3>Current Advertisement</h3>

            <img
              src={currentAd.asset_url}
              alt="ad"
              className="adImage"
            />

            <p>Ad ID: {currentAd.ad_id}</p>
            <p>Duration: {currentAd.duration_sec}s</p>

          </div>

        )}

      </div>

    </div>


    {/* Ad Rules 放到底部 */}

    <div className="card adRules">

      <h2>Ad Rules</h2>
      {controlMsg && (
        <p style={{color:"#38bdf8", marginBottom:"10px"}}>
          {controlMsg}
        </p>
      )}
      <table>

        <thead>
          <tr>
            <th>Ad</th>
            <th>Gender</th>
            <th>Age</th>
            <th>Count</th>
            <th>Priority</th>
            <th>Control</th>
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

              <td>

              <button
              className="controlBtn"
              onClick={() => forceAdToScreen(ad)}
              disabled={sendingAdId === ad.ad_id}
              >

              {sendingAdId === ad.ad_id ? "Sending..." : "Push"}

              </button>

              </td>

            </tr>

            ))}

        </tbody>

      </table>

    </div>

  </div>

);

}

export default App;