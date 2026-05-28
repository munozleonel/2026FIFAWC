// script.js

async function loadAllData() {
    await loadGroups();
    await loadResultsAndFixtures();
}

// ====================== GROUPS ======================
async function loadGroups() {
    try {
        const res = await fetch('data/groups.json?' + Date.now());
        const data = await res.json();
        displayGroups(data.groups || []);
    } catch (e) {
        console.error("Groups failed", e);
        document.getElementById('groups-container').innerHTML = "<p>Groups data not available yet.</p>";
    }
}

function displayGroups(groups) {
    const container = document.getElementById('groups-container');
    let html = "";

    groups.forEach(group => {
        html += `<h3>Group ${group.group}</h3>`;
        html += `<table class="group-table">
            <tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>`;

        group.table.forEach(team => {
            html += `<tr>
                <td><strong>${team.team}</strong></td>
                <td>${team.played}</td>
                <td>${team.won}</td>
                <td>${team.drawn}</td>
                <td>${team.lost}</td>
                <td>${team.gf}</td>
                <td>${team.ga}</td>
                <td>${team.gd}</td>
                <td><strong>${team.points}</strong></td>
            </tr>`;
        });
        html += `</table>`;
    });

    container.innerHTML = html;
}

// ====================== FIXTURES & RESULTS ======================
async function loadResultsAndFixtures() {
    try {
        const res = await fetch('data/worldcup.json?' + Date.now());
        const data = await res.json();
        
        const matches = data.matches || [];
        const today = new Date().toISOString().split('T')[0];

        const results = matches.filter(m => m.score);           // Has score = completed
        const fixtures = matches.filter(m => !m.score);         // No score = upcoming

        displayResults(results);
        displayFixtures(fixtures);

    } catch (e) {
        console.error("Matches failed", e);
    }
}

function displayResults(matches) {
    const container = document.getElementById('results-container');
    if (matches.length === 0) {
        container.innerHTML = "<p>No results yet.</p>";
        return;
    }
    displayMatches(matches, container, "Results");
}

function displayFixtures(matches) {
    const container = document.getElementById('fixtures-container');
    if (matches.length === 0) {
        container.innerHTML = "<p>No upcoming fixtures at the moment.</p>";
        return;
    }
    displayMatches(matches, container, "Fixtures");
}

function displayMatches(matches, container, title) {
    const grouped = {};
    matches.forEach(match => {
        const round = match.round || "Other";
        if (!grouped[round]) grouped[round] = [];
        grouped[round].push(match);
    });

    let html = "";
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
                        <div class="vs">${match.score ? match.score : 'VS'}</div>
                        <div class="team">${match.team2}</div>
                    </div>
                    ${match.group ? `<small>Group ${match.group}</small>` : ''}
                </div>`;
        });
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Load everything
document.addEventListener('DOMContentLoaded', loadAllData);
