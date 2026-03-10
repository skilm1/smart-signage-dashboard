import "./App.css";
import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Legend,
  Tooltip
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

function App() {

  const [events, setEvents] = useState([]);
  const [ads, setAds] = useState([]);
  const [error, setError] = useState("");

  const EVENTS_API = "https://dj7r6jv7tk.execute-api.eu-north-1.amazonaws.com/events";
  const ADS_API = "https://dj7r6jv7tk.execute-api.eu-north-1.amazonaws.com/ads";

  const loadData = async () => {
    try {

      setError("");

      const eventsRes = await fetch(EVENTS_API);
      const adsRes = await fetch(ADS_API);

      const eventsData = await eventsRes.json();
      const adsData = await adsRes.json();

      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setAds(Array.isArray(adsData) ? adsData : []);

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

  const timestamps = events.map(e => e.ts);
  const temperatures = events.map(e => e.temperature ?? null);
  const humidity = events.map(e => e.humidity ?? null);
  const peopleCounts = events.map(e => e.person_count ?? null);

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

  return (

    <div className="dashboard">

      <h1>SMART SIGNAGE AI SYSTEM</h1>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div className="stats">

        <div className="statCard">
          <div>People</div>
          <div className="statNumber">{latest?.person_count ?? 0}</div>
        </div>

        <div className="statCard">
          <div>Avg Age</div>
          <div className="statNumber">{latest?.age_mid ?? 0}</div>
        </div>

        <div className="statCard">
          <div>Temp</div>
          <div className="statNumber">{latest?.temperature ?? "--"}°</div>
        </div>

        <div className="statCard">
          <div>Humidity</div>
          <div className="statNumber">{latest?.humidity ?? "--"}%</div>
        </div>

      </div>


      <div className="grid">

        <div className="card">

          <h2>Latest Event</h2>

          {latest ? (
            <>
              <p>Device: {latest.device_id}</p>
              <p>Timestamp: {latest.ts}</p>
              <p>People: {latest.person_count}</p>
              <p>Faces: {latest.face_count}</p>
              <p>Age: {latest.age_mid}</p>
              <p>Gender: {latest.gender}</p>
              <p>Ad: {latest.selected_ad_id}</p>
              <p>Temp: {latest.temperature ?? "N/A"} °C</p>
              <p>Humidity: {latest.humidity ?? "N/A"} %</p>
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
              {ads.map((ad) => (
                <tr key={ad.ad_id}>
                  <td>{ad.ad_id}</td>
                  <td>{ad.gender}</td>
                  <td>{ad.age_min}-{ad.age_max}</td>
                  <td>{ad.min_count}-{ad.max_count}</td>
                  <td>{ad.priority}</td>
                </tr>
              ))}
            </tbody>

          </table>

        </div>

      </div>


      <div className="chartsGrid">

        <div className="chart">
          <h3>People Traffic</h3>
          <Line data={peopleChart} options={{responsive:true,maintainAspectRatio:false}} />
        </div>

        <div className="chart">
          <h3>Temperature Trend</h3>
          <Line data={temperatureChart} options={{responsive:true,maintainAspectRatio:false}} />
        </div>

        <div className="chart">
          <h3>Humidity Trend</h3>
          <Line data={humidityChart} options={{responsive:true,maintainAspectRatio:false}} />
        </div>

      </div>


      <div className="card" style={{marginTop:"20px"}}>

        <h2>Recent Events</h2>

        <table>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Device</th>
              <th>People</th>
              <th>Faces</th>
              <th>Age</th>
              <th>Gender</th>
              <th>Temp</th>
              <th>Humidity</th>
              <th>Ad</th>
            </tr>
          </thead>

          <tbody>
            {events.map((e, idx) => (
              <tr key={idx}>
                <td>{e.ts}</td>
                <td>{e.device_id}</td>
                <td>{e.person_count}</td>
                <td>{e.face_count}</td>
                <td>{e.age_mid}</td>
                <td>{e.gender}</td>
                <td>{e.temperature ?? "-"}</td>
                <td>{e.humidity ?? "-"}</td>
                <td>{e.selected_ad_id}</td>
              </tr>
            ))}
          </tbody>

        </table>

      </div>

    </div>
  );
}

export default App;