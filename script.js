<script>
// Load and display World Cup data
async function loadWorldCupData() {
    try {
        const response = await fetch('data/worldcup.json');
        const data = await response.json();

        console.log("World Cup data loaded:", data.name);
        
        // Display fixtures
        displayFixtures(data.matches);
        
        // You can add more functions later (groups, standings, etc.)
        
    } catch (error) {
        console.error("Error loading data:", error);
        document.getElementById('fixtures-container').innerHTML = 
            "<p style='color:red;'>Unable to load match data. Please try again later.</p>";
    }
}

// Display all fixtures grouped by round
function displayFixtures(matches) {
    const container = document.getElementById('fixtures-container');
    if (!container) return;

    // Group matches by round
    const grouped = {};
    matches.forEach(match => {
        if (!grouped[match.round]) grouped[match.round] = [];
        grouped[match.round].push(match);
    });

    let html = `<h2>${data.name || "FIFA World Cup 2026"}</h2>`;

    Object.keys(grouped).forEach(round => {
        html += `<h3>${round}</h3>`;
        html += `<div class="matches">`;
        
        grouped[round].forEach(match => {
            html += `
                <div class="match">
                    <div class="match-info">
                        <span>${match.date} • ${match.time}</span>
                        <span>${match.ground}</span>
                    </div>
                    <div class="teams">
                        <div class="team">${match.team1}</div>
                        <div class="vs">VS</div>
                        <div class="team">${match.team2}</div>
                    </div>
                    ${match.score ? `<div class="score">${match.score}</div>` : ''}
                </div>
            `;
        });
        
        html += `</div>`;
    });

    container.innerHTML = html;
}

// Run when page loads
document.addEventListener('DOMContentLoaded', loadWorldCupData);
</script>
