// script.js
async function loadWorldCupData() {
    try {
        const response = await fetch('data/worldcup.json');
        if (!response.ok) throw new Error('Failed to load JSON');

        const data = await response.json();
        
        console.log("✅ Data loaded! Matches:", data.matches?.length || 0);
        
        displayFixtures(data);

    } catch (error) {
        console.error("❌ Error:", error);
        document.getElementById('fixtures-container').innerHTML = `
            <p style="color:red; text-align:center;">
                Error loading data.<br>
                <small>Check browser console (F12) for details.</small>
            </p>`;
    }
}

function displayFixtures(data) {
    const container = document.getElementById('fixtures-container');
    if (!container) return;

    const matches = data.matches || [];
    
    if (matches.length === 0) {
        container.innerHTML = "<p>No matches available yet.</p>";
        return;
    }

    // Group matches by round
    const grouped = {};
    matches.forEach(match => {
        const round = match.round || "Other Matches";
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
                        ${match.date} • ${match.time} | ${match.ground || ''}
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

// Load data when page is ready
document.addEventListener('DOMContentLoaded', loadWorldCupData);
