const DEVICE_ID = "alertnet01";

let latestReading = null;


// ============================================================
// CONNECTION STATUS
// ============================================================

function setConnectionStatus(connected) {

    const dot = document.getElementById("connectionDot");
    const text = document.getElementById("connectionText");

    if (connected) {
        dot.style.background = "#42c98a";
        text.textContent = "Connected";
    } else {
        dot.style.background = "#d94a4a";
        text.textContent = "Disconnected";
    }
}


// ============================================================
// LOAD LATEST SENSOR READING
// ============================================================

async function loadLatestReading() {

    try {

        const response = await fetch("/api/readings/latest");

        if (!response.ok) {
            throw new Error("Failed to load sensor reading");
        }

        const data = await response.json();

        if (!data || data.message === "No sensor readings yet") {
            setConnectionStatus(true);
            return;
        }

        setConnectionStatus(true);

        latestReading = data;

        updateDashboard(latestReading);

    } catch (error) {

        console.error("Sensor reading error:", error);

        setConnectionStatus(false);
    }
}


// ============================================================
// UPDATE DASHBOARD
// ============================================================

function updateDashboard(data) {

    document.getElementById("temperature").textContent =
        data.temperature !== null && data.temperature !== undefined
            ? `${Number(data.temperature).toFixed(1)} °C`
            : "-- °C";


    document.getElementById("humidity").textContent =
        data.humidity !== null && data.humidity !== undefined
            ? `${Number(data.humidity).toFixed(1)} %`
            : "-- %";


    document.getElementById("gasLevel").textContent =
        data.gas_level !== null && data.gas_level !== undefined
            ? Number(data.gas_level).toFixed(0)
            : "--";


    document.getElementById("scanAngle").textContent =
        data.scan_angle !== null && data.scan_angle !== undefined
            ? `${Number(data.scan_angle).toFixed(0)}°`
            : "--°";


    document.getElementById("scannerAngle").textContent =
        data.scan_angle !== null && data.scan_angle !== undefined
            ? `${Number(data.scan_angle).toFixed(0)}°`
            : "--°";


    document.getElementById("deviceId").textContent =
        data.device_id || DEVICE_ID;


    document.getElementById("flameStatus").textContent =
        data.flame_detected ? "DETECTED" : "NOT DETECTED";


    document.getElementById("hazardStatus").textContent =
        data.hazard_detected
            ? "HAZARD DETECTED"
            : "NORMAL";


    document.getElementById("lastUpdate").textContent =
        formatTime(data.created_at);


    document.getElementById("footerDevice").textContent =
        data.device_id || DEVICE_ID;


    updateSystemStatus(data.hazard_detected);

    updateScanner(data.scan_angle);
}


// ============================================================
// SYSTEM STATUS
// ============================================================

function updateSystemStatus(hazard) {

    const card = document.getElementById("systemStatus");
    const title = document.getElementById("statusText");
    const icon = document.getElementById("statusIcon");

    if (hazard) {

        card.classList.remove("normal");
        card.classList.add("danger");

        title.textContent = "HAZARD DETECTED";
        icon.textContent = "!";

    } else {

        card.classList.remove("danger");
        card.classList.add("normal");

        title.textContent = "SYSTEM NORMAL";
        icon.textContent = "✓";
    }
}


// ============================================================
// SCANNER
// ============================================================

function updateScanner(angle) {

    if (angle === null || angle === undefined) {
        return;
    }

    const line = document.getElementById("scannerLine");

    line.style.transform =
        `rotate(${Number(angle)}deg)`;
}


// ============================================================
// LOAD DEVICE CONTROL
// ============================================================

async function loadDeviceControl() {

    try {

        const response = await fetch(`/api/control/${DEVICE_ID}`);

        if (!response.ok) {
            throw new Error("Failed to load device control");
        }

        const control = await response.json();

        document.getElementById("pumpStatus").textContent =
            control.pump ? "ON" : "OFF";


        document.getElementById("alarmStatus").textContent =
            control.alarm ? "ON" : "OFF";


        document.getElementById("modeStatus").textContent =
            control.manual_override
                ? "MANUAL"
                : "AUTOMATIC";


        document.getElementById("targetAngle").textContent =
            control.target_angle !== null &&
            control.target_angle !== undefined
                ? `${Number(control.target_angle).toFixed(0)}°`
                : "--°";

    } catch (error) {

        console.error("Device control error:", error);
    }
}


// ============================================================
// LOAD HAZARD EVENTS
// ============================================================

async function loadEvents() {

    try {

        const response = await fetch(
            `/api/events/${DEVICE_ID}`
        );

        if (!response.ok) {
            throw new Error("Failed to load hazard events");
        }

        const data = await response.json();

        const table = document.getElementById("eventTable");


        if (!data || data.length === 0) {

            table.innerHTML = `
                <tr>
                    <td colspan="7">
                        No hazard events recorded.
                    </td>
                </tr>
            `;

            return;
        }


        table.innerHTML = "";


        data.forEach(event => {

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>${formatTime(event.created_at)}</td>

                <td>
                    ${escapeHTML(event.event_type)}
                </td>

                <td>
                    ${escapeHTML(event.severity)}
                </td>

                <td>
                    ${event.temperature ?? "--"} °C
                </td>

                <td>
                    ${event.gas_level ?? "--"}
                </td>

                <td>
                    ${event.scan_angle ?? "--"}°
                </td>

                <td>
                    ${escapeHTML(event.action_taken ?? "--")}
                </td>
            `;

            table.appendChild(row);
        });

    } catch (error) {

        console.error("Event history error:", error);
    }
}


// ============================================================
// TIME FORMAT
// ============================================================

function formatTime(timestamp) {

    if (!timestamp) {
        return "--";
    }

    return new Date(timestamp).toLocaleString();
}


// ============================================================
// BASIC HTML ESCAPING
// ============================================================

function escapeHTML(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// ============================================================
// INITIAL LOAD
// ============================================================

async function refreshDashboard() {

    await loadLatestReading();
    await loadDeviceControl();
    await loadEvents();
}


refreshDashboard();


// ============================================================
// AUTOMATIC REFRESH
// ============================================================

setInterval(refreshDashboard, 3000);