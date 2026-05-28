// script.js
async function loadWorldCupData() {
    try {
        const response = await fetch('data/worldcup.json?' + Date.now()); // Prevent caching
        if (!response.ok) throw new Error('Failed to load JSON');

        const data = await response.json();
        
        console.log("✅ Data loaded successfully! Total matches:", data.matches?.length || 0);
        
        displayFixtures(data);

    } catch (error) {
        console.error("❌ Error loading data:", error);
        document.getElementById('fixtures-container').innerHTML = `
            <p style="color:red; text-align:center;">
                Unable to load match data.<br>
                <small>Please refresh the page.</small>
            </p>`;
    }
}

function displayFixtures(data) {
    const container = document.getElementById('fixtures-container');
    if (!container) return;

    const matches = data.matches || [];
    
    if (matches.length === 0) {
        container.innerHTML = "<p>No matches found in the data yet.</p>";
        return;
    }

    const grouped = {};
    matches.forEach(match => {
        const round = match.round || "Other";
        if (!grouped[round]) grouped[round] = [];
        grouped[round].push(match);
    });

    let html = `<h2>${data.name || "2026 FIFA World Cup"}</h2>`;

    Object.keys(grouped).sort().forEach(round => {
        html += `<h3>${round}</h3><div class="matches">`;
        
        grouped[round].forEach(match => {
            html += `
                <div class="match">
                    <div class="match-info">
                        ${match.date} • ${match.time || ''} | ${match.ground || ''}
                    </div>
                    <div class="teams">
                        <div class="team">${match.team1}</div>
                        <div class="vs">VS</div>
                        <div class="team">${match.team2}</div>
                    </div>
                    ${match.group ? `<small>Group ${match.group}</small>` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Load the data
document.addEventListener('DOMContentLoaded', loadWorldCupData);
