<script>
// ===============================================
// DATA LOADING FROM JSON FILES
// ===============================================

let GROUPS_DATA = {};
let FIXTURES_RAW = [];

// Load data from JSON files
async function loadExternalData() {
    try {
        // Load Groups + Standings
        const groupsRes = await fetch('data/groups.json?' + Date.now());
        if (groupsRes.ok) {
            const groupsJson = await groupsRes.json();
            GROUPS_DATA = {};
            groupsJson.groups.forEach(group => {
                GROUPS_DATA[group.group] = group.table.map(team => [
                    team.team,
                    team.played,
                    team.gf,
                    team.ga,
                    team.points,
                    "active"
                ]);
            });
        }

        // Load Fixtures & Results
        const wcRes = await fetch('data/worldcup.json?' + Date.now());
        if (wcRes.ok) {
            const wcData = await wcRes.json();
            FIXTURES_RAW = (wcData.matches || []).map(match => [
                match.group || "Other",
                match.date + "T" + (match.time || "00:00:00") + "Z",  // Approximate time
                match.team1,
                match.team2,
                match.ground || "TBD",
                match.city || "",
                "", "", ""  // Odds (can be ignored)
            ]);
        }
    } catch (e) {
        console.error("Failed to load JSON data:", e);
    }
}

// ===============================================
// REST OF YOUR ORIGINAL CODE (with small updates)
// ===============================================

// ... [Keep all your existing functions: renderFlag, buildGroupTables, buildFixtures, etc.] ...

// Update buildGroupTables to use loaded data
function buildGroupTables() {
    const grid = document.getElementById('groups-grid');
    grid.innerHTML = '';

    Object.keys(GROUPS_DATA).sort().forEach(grp => {
        const sorted = [...GROUPS_DATA[grp]].sort((a, b) => b[4] - a[4] || (b[2] - b[3]) - (a[2] - a[3]) || b[2] - a[2]);
        
        const card = document.createElement('div');
        card.className = 'group-card';
        let rows = '';

        sorted.forEach(([team, gp, gf, ga, pts, status], i) => {
            const gd = gf - ga;
            const isF = followedTeams.has(team);
            let nc = 'gt-name';
            if (isF) nc += ' followed-name';

            const w = Math.floor(pts / 3);
            const d = pts - w * 3;
            const l = gp - w - d;

            rows += `<tr${i === 1 ? ' class="advance-line"' : ''}>
                <td><div class="gt-team-cell">
                    <span class="gt-pos">${i+1}</span>
                    ${renderFlag(team,'sm')}
                    <span class="${nc}">${team}</span>
                </div></td>
                <td>${gp}</td>
                <td class="gt-w">${w}</td>
                <td class="gt-d">${d}</td>
                <td class="gt-l">${l}</td>
                <td>${gf}</td><td>${ga}</td>
                <td>${gd > 0 ? '+' + gd : gd}</td>
                <td class="gt-pts">${pts}</td>
            </tr>`;
        });

        card.innerHTML = `
            <div class="group-card-header">
                <span class="group-label">GROUP ${grp}</span>
            </div>
            <table class="group-table">
                <thead><tr><th>Team</th><th>GP</th><th class="gt-w">W</th><th>D</th><th class="gt-l">L</th><th>GF</th><th>GA</th><th>GD</th><th>PTS</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;
        grid.appendChild(card);
    });
}

// Call this instead of using hardcoded FIXTURES_RAW in buildFixtures
// (Your existing buildFixtures() function can stay mostly the same)

// Initialize everything
async function init() {
    await loadExternalData();        // ← Important: Load JSON first
    buildTZSelector();
    buildTeamList();
    buildGroupTables();
    buildFixtures();
    buildTopPerformers();
    buildFanTeamPlayers();
    initSubsecHeights();
    updateClock();
    updateCountdown();
    updateFixFilterCount();

    setInterval(updateClock, 1000);
    setInterval(updateCountdown, 1000);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
</script>
