// script.js
async function loadWorldCupData() {
    try {
        const response = await fetch('data/worldcup.json');
        if (!response.ok) throw new Error('Failed to load data');

        const data = await response.json();
        
        console.log("✅ Data loaded successfully:", data.name);
        
        displayFixtures(data.matches || []);

    } catch (error) {
        console.error("❌ Error loading data:", error);
        document.getElementById('fixtures-container').innerHTML = `
            <p style="color:red; text-align:center;">
                Unable to load match data.<br>
                Please wait a few minutes and refresh.
            </p>`;
    }
}

function displayFixtures(matches) {
    const container = document.getElementById('fixtures-container');
    if (!container) return;

    if (!matches || matches.length === 0) {
        container.innerHTML = "<p>No matches found yet.</p>";
        return;
    }

    // Group matches by round
    const grouped = {};
    matches.forEach(match => {
        const round = match.round || "Other";
        if (!grouped[round]) grouped[round] = [];
        grouped[round].push(match);
    });

    let html = `<h2>${data ? data.name : "FIFA World Cup 2026"}</h2>`;

    Object.keys(grouped).sort().forEach(round => {
        html += `<h3>${round}</h3><div class="matches">`;
        
        grouped[round].forEach(match => {
            html += `
                <div class="match">
                    <div class="match-info">
                        ${match.date} • ${match.time} | ${match.ground || ''}
                    </div>
                    <div class="teams">
                        <div class="team">${match.team1}</div>
                        <div class="vs">VS</div>
                        <div class="team">${match.team2}</div>
                    </div>
                    ${match.score ? `<div class="score">${match.score}</div>` : ''}
                    ${match.group ? `<small>Group ${match.group}</small>` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Auto load when page opens
document.addEventListener('DOMContentLoaded', loadWorldCupData);
