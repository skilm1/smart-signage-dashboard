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
  const date = new Date(ts * 1000);
  return date.toISOString().replace("T", " ").slice(0, 19);
}

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

  const timestamps = events.map(e => formatTime(e.ts));
  const temperatures = events.map(e => e.temperature ?? null);
  const humidity = events.map(e => e.humidity ?? null);
  const peopleCounts = events.map(e => e.person_count ?? null);

  const temperatureChart = {
    labels: timestamps,
    datasets: [{
      label: "Temperature",
      data: temperatures,
      borderColor: "#38bdf8",
      tension: 0.3
    }]
  };

  const humidityChart = {
    labels: timestamps,
    datasets: [{
      label: "Humidity",
      data: humidity,
      borderColor: "#22c55e",
      tension: 0.3
    }]
  };

  const peopleChart = {
    labels: timestamps,
    datasets: [{
      label: "People",
      data: peopleCounts,
      borderColor: "#f59e0b",
      tension: 0.3
    }]
  };

  const male = events.filter(e => e.gender === "Male").length;
  const female = events.filter(e => e.gender === "Female").length;

  const genderChart = {
    labels: ["Male", "Female"],
    datasets: [{
      data: [male, female],
      backgroundColor: ["#3b82f6", "#ec4899"]
    }]
  };

  const ageGroups = [0,0,0,0];

  events.forEach(e=>{
    const age = e.age_mid;
    if(age < 18) ageGroups[0]++;
    else if(age < 25) ageGroups[1]++;
    else if(age < 40) ageGroups[2]++;
    else ageGroups[3]++;
  });

  const ageChart = {
    labels:["<18","18-25","25-40","40+"],
    datasets:[{
      label:"Age Distribution",
      data:ageGroups,
      backgroundColor:"#22c55e"
    }]
  };

  const adCounts = {};

  events.forEach(e=>{
    const id = e.selected_ad_id;
    if(id){
      adCounts[id] = (adCounts[id] || 0) + 1;
    }
  });

  const adChart = {
    labels:Object.keys(adCounts),
    datasets:[{
      label:"Ad Triggers",
      data:Object.values(adCounts),
      backgroundColor:"#f97316"
    }]
  };

  return(

    <div className="dashboard">

      <h1>SMART SIGNAGE AI SYSTEM</h1>

      {error && <p style={{color:"red"}}>Error: {error}</p>}

      {/* Stats */}

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

      {/* Top Cards */}

      <div className="grid">

        <div className="card">

          <h2>Latest Event</h2>

          {latest ? (
            <>
              <p>Device: {latest.device_id}</p>
              <p>Timestamp: {formatTime(latest.ts)}</p>
              <p>People: {latest.person_count}</p>
              <p>Faces: {latest.face_count}</p>
              <p>Age: {latest.age_mid}</p>
              <p>Gender: {latest.gender}</p>
              <p>Ad: {latest.selected_ad_id}</p>
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

            {ads.map(ad=>(
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

      {/* Traffic Charts */}

      <div className="chartsGrid">

        <div className="chart">
          <h3>People Traffic</h3>
          <Line data={peopleChart} options={{responsive:true,maintainAspectRatio:false}}/>
        </div>

        <div className="chart">
          <h3>Temperature</h3>
          <Line data={temperatureChart} options={{responsive:true,maintainAspectRatio:false}}/>
        </div>

        <div className="chart">
          <h3>Humidity</h3>
          <Line data={humidityChart} options={{responsive:true,maintainAspectRatio:false}}/>
        </div>

      </div>

      {/* Analytics */}

      <div className="chartsGrid">

        <div className="chart">
          <h3>Gender Distribution</h3>
          <Pie data={genderChart}/>
        </div>

        <div className="chart">
          <h3>Age Distribution</h3>
          <Bar data={ageChart}/>
        </div>

      </div>

      <div className="chart">

        <h3>Ad Trigger Analytics</h3>

        <Bar data={adChart}/>

      </div>

      {/* Recent Events */}

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

            {events.slice(0,20).map((e,idx)=>(
              <tr key={idx}>
                <td>{formatTime(e.ts)}</td>
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