<script>
// ===============================================
// DATA LOADING FROM JSON
// ===============================================

let GROUPS_DATA = {};
let MATCHES_DATA = [];

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

        // Load Matches (Fixtures + Results)
        const wcRes = await fetch('data/worldcup.json?' + Date.now());
        if (wcRes.ok) {
            const wcData = await wcRes.json();
            MATCHES_DATA = wcData.matches || [];
        }
    } catch (e) {
        console.error("Failed to load JSON data:", e);
    }
}

// ===============================================
// GROUP TABLES (Improved Styling)
// ===============================================

function buildGroupTables() {
    const grid = document.getElementById('groups-grid');
    grid.innerHTML = '';

    Object.keys(GROUPS_DATA).sort().forEach(grp => {
        const teams = [...GROUPS_DATA[grp]];
        // Sort by points, then goal difference, then goals
        teams.sort((a, b) => b[4] - a[4] || (b[2] - b[3]) - (a[2] - a[3]) || b[2] - a[2]);

        const card = document.createElement('div');
        card.className = 'group-card';
        
        let rows = '';
        teams.forEach(([team, gp, gf, ga, pts, status], i) => {
            const gd = gf - ga;
            const isFollowed = followedTeams.has(team);
            const w = Math.floor(pts / 3);
            const d = pts - w * 3;
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
                <thead>
                    <tr>
                        <th>Team</th><th>GP</th><th class="gt-w">W</th><th>D</th><th class="gt-l">L</th>
                        <th>GF</th><th>GA</th><th>GD</th><th>PTS</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>`;
        grid.appendChild(card);
    });
}

// ===============================================
// FIXTURES → RESULTS + UPCOMING
// ===============================================

function buildFixtures() {
    const container = document.getElementById('fixtures-container');
    container.innerHTML = '';

    const completed = MATCHES_DATA.filter(m => m.score);
    const upcoming = MATCHES_DATA.filter(m => !m.score);

    // Results Section
    if (completed.length > 0) {
        const resHeader = document.createElement('div');
        resHeader.className = 'date-group-header';
        resHeader.innerHTML = `✅ Recent Results`;
        container.appendChild(resHeader);
        appendMatches(completed, container, true);
    }

    // Upcoming Section
    if (upcoming.length > 0) {
        const upHeader = document.createElement('div');
        upHeader.className = 'date-group-header';
        upHeader.innerHTML = `📅 Upcoming Fixtures`;
        container.appendChild(upHeader);
        appendMatches(upcoming, container, false);
    }

    if (completed.length === 0 && upcoming.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding:40px; color:var(--fg-muted);">No matches available yet.</p>`;
    }
}

function appendMatches(matches, container, isResult) {
    const grouped = {};
    matches.forEach(match => {
        const round = match.round || "Other";
        if (!grouped[round]) grouped[round] = [];
        grouped[round].push(match);
    });

    Object.keys(grouped).sort().forEach(round => {
        const section = document.createElement('div');
        section.innerHTML = `<h3 style="margin:12px 0 8px; color:var(--fifa-sky);">${round}</h3>`;
        container.appendChild(section);

        grouped[round].forEach(match => {
            const card = document.createElement('div');
            card.className = `fixture-card ${followedTeams.has(match.team1) || followedTeams.has(match.team2) ? 'followed-match' : ''}`;
            
            const scoreHTML = isResult && match.score ? 
                `<span style="font-weight:700; color:var(--fifa-gold);">${match.score}</span>` : 
                `<span class="fix-vs">VS</span>`;

            card.innerHTML = `
                <div class="fixture-main">
                    <div class="fix-meta">
                        <span class="fix-time">${match.time || 'TBD'}</span>
                        <span class="fix-date-small">${match.date}</span>
                    </div>
                    <div class="fix-sep"></div>
                    <div class="fix-teams">
                        <div class="fix-team">${renderFlag(match.team1,'md')}<span class="fix-team-name">${match.team1}</span></div>
                        ${scoreHTML}
                        <div class="fix-team away">${renderFlag(match.team2,'md')}<span class="fix-team-name">${match.team2}</span></div>
                    </div>
                </div>`;
            container.appendChild(card);
        });
    });
}

// ===============================================
// AUTO REFRESH
// ===============================================

let refreshInterval;

function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    refreshInterval = setInterval(async () => {
        await loadExternalData();
        buildGroupTables();
        buildFixtures();
        console.log("✅ Data refreshed automatically");
    }, 180000); // Every 3 minutes
}

// ===============================================
// INITIALIZE
// ===============================================

async function init() {
    await loadExternalData();
    
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

    startAutoRefresh();   // ← Auto refresh enabled

    setInterval(updateClock, 1000);
    setInterval(updateCountdown, 1000);
}

document.addEventListener('DOMContentLoaded', init);
</script>
