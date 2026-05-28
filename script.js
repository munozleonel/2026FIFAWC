// Load Groups
async function loadGroups() {
    try {
        const res = await fetch('data/groups.json?' + Date.now());
        const data = await res.json();
        displayGroups(data.groups);
    } catch(e) { console.error("Groups load failed", e); }
}

function displayGroups(groups) {
    const container = document.getElementById('groups-container');
    let html = "<h2>Groups</h2>";
    
    groups.forEach(g => {
        html += `<h3>Group ${g.group}</h3><ul>`;
        g.teams.forEach(team => {
            html += `<li>${team}</li>`;
        });
        html += `</ul>`;
    });
    
    container.innerHTML = html;
}

// Load Standings
async function loadStandings() {
    try {
        const res = await fetch('data/standings.json?' + Date.now());
        const data = await res.json();
        displayStandings(data.standings);
    } catch(e) { console.error("Standings load failed", e); }
}

function displayStandings(standings) {
    const container = document.getElementById('standings-container');
    let html = "<h2>Current Standings</h2>";
    
    standings.forEach(group => {
        html += `<h3>Group ${group.group}</h3>`;
        html += `<table class="group-table"><tr><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th><th>Pts</th></tr>`;
        
        group.table.forEach(team => {
            html += `<tr>
                <td>${team.team}</td>
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

// Call all loaders
document.addEventListener('DOMContentLoaded', () => {
    loadWorldCupData();
    loadGroups();
    loadStandings();
});
