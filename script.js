<script>
// ===============================================
// EXTERNAL DATA LOADING
// ===============================================

let GROUPS_DATA = {};
let MATCHES_DATA = [];

// Load standings and matches from JSON files
async function loadExternalData() {
    try {
        console.log("🔄 Loading data from JSON...");

        // 1. Load Groups + Standings
        const groupsRes = await fetch('data/groups.json?' + Date.now());
        if (groupsRes.ok) {
            const groupsJson = await groupsRes.json();
            GROUPS_DATA = {};
            
            if (groupsJson.groups) {
                groupsJson.groups.forEach(group => {
                    GROUPS_DATA[group.group] = group.table.map(team => [
                        team.team,
                        team.played || 0,
                        team.gf || 0,
                        team.ga || 0,
                        team.points || 0,
                        "active"
                    ]);
                });
                console.log("✅ Groups loaded:", Object.keys(GROUPS_DATA).length, "groups");
            }
        }

        // 2. Load Matches (for Results & Fixtures)
        const wcRes = await fetch('data/worldcup.json?' + Date.now());
        if (wcRes.ok) {
            const wcData = await wcRes.json();
            MATCHES_DATA = wcData.matches || [];
            console.log("✅ Matches loaded:", MATCHES_DATA.length, "matches");
        }
    } catch (e) {
        console.error("❌ Failed to load JSON data:", e);
    }
}

// ===============================================
// GROUP TABLES (Updated)
// ===============================================

function buildGroupTables() {
    const grid = document.getElementById('groups-grid');
    grid.innerHTML = '';

    Object.keys(GROUPS_DATA).sort().forEach(grp => {
        let teams = [...GROUPS_DATA[grp]];
        // Sort: Points → GD → GF
        teams.sort((a, b) => b[4] - a[4] || (b[2] - b[3]) - (a[2] - a[3]) || b[2] - a[2]);

        const card = document.createElement('div');
        card.className = 'group-card';
        
        let rows = '';
        teams.forEach(([team, gp, gf, ga, pts], i) => {
            const gd = gf - ga;
            const isFollowed = followedTeams.has(team);
            const w = Math.floor(pts / 3);
            const d = pts - (w * 3);
            const l = gp - w - d;

            rows += `
                <tr ${i < 2 ? 'class="advance-line"' : ''}>
                    <td><div class="gt-team-cell">
                        <span class="gt-pos">${i+1}</span>
                        ${renderFlag(team,'sm')}
                        <span class="gt-name ${isFollowed ? 'followed-name' : ''}">${team}</span>
                    </div></td>
                    <td>${gp}</td>
                    <td class="gt-w">${w}</td>
                    <td class="gt-d">${d}</td>
                    <td class="gt-l">${l}</td>
                    <td>${gf}</td>
                    <td>${ga}</td>
                    <td>${gd >= 0 ? '+' + gd : gd}</td>
                    <td class="gt-pts"><strong>${pts}</strong></td>
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

// Keep the rest of your original script (buildFixtures, buildTopPerformers, etc.)
// ... (your existing code from buildFixtures onwards stays the same) ...

// ===============================================
// INITIALIZE
// ===============================================

async function init() {
    await loadExternalData();     // ← This loads the JSON files

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

document.addEventListener('DOMContentLoaded', init);
</script>
