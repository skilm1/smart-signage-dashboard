import { useEffect, useState } from "react";

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

      console.log("events:", eventsData);
      console.log("ads:", adsData);

      setEvents(Array.isArray(eventsData) ? eventsData : []);
      setAds(Array.isArray(adsData) ? adsData : []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, []);

  const latest = events.length > 0 ? events[0] : null;

  return (
    <div style={{ fontFamily: "Arial", padding: 24 }}>
      <h1>Smart Signage Dashboard</h1>

      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2>Latest Event</h2>
          {latest ? (
            <>
              <p><strong>Device:</strong> {latest.device_id}</p>
              <p><strong>Timestamp:</strong> {latest.ts}</p>
              <p><strong>People Count:</strong> {latest.person_count}</p>
              <p><strong>Face Count:</strong> {latest.face_count}</p>
              <p><strong>Average Age:</strong> {latest.age_mid}</p>
              <p><strong>Gender:</strong> {latest.gender}</p>
              <p><strong>Selected Ad:</strong> {latest.selected_ad_id}</p>
            </>
          ) : (
            <p>No data</p>
          )}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2>Ad Rules</h2>
          <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Ad</th>
                <th align="left">Gender</th>
                <th align="left">Age</th>
                <th align="left">Count</th>
                <th align="left">Priority</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad) => (
                <tr key={ad.ad_id}>
                  <td>{ad.ad_id}</td>
                  <td>{ad.gender}</td>
                  <td>{ad.age_min} - {ad.age_max}</td>
                  <td>{ad.min_count} - {ad.max_count}</td>
                  <td>{ad.priority}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 24, border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
        <h2>Recent Events</h2>
        <table width="100%" cellPadding="8" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th align="left">Timestamp</th>
              <th align="left">Device</th>
              <th align="left">People</th>
              <th align="left">Faces</th>
              <th align="left">Age</th>
              <th align="left">Gender</th>
              <th align="left">Ad</th>
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