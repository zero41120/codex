import { CONSTANTS } from './constants.js';
import { state } from './state.js';
import * as dataFns from './dataFunctions.js';
import { calcFns } from './calculations.js';
import { ui } from './ui.js';

function doCalculate() {
  if (!state.items.length) {
    document.getElementById('result').innerHTML = "<span style='color: #d32f2f'>Data not loaded yet.</span>";
    return;
  }
  
  const statSelect = document.getElementById('stat');
  if (statSelect.options.length === 0 || statSelect.disabled) {
    document.getElementById('result').innerHTML = "<span style='color: #d32f2f'>No valid stat types with at least 3 items.</span>";
    return;
  }
  
  // Get form values
  const cash = parseInt(document.getElementById('cash').value, 10);
  const reserves = [1, 2, 3, 4, 5].map(i => parseInt(document.getElementById('reserve' + i).value, 10) || 0);
  const totalReserve = reserves.reduce((a, b) => a + b, 0);
  const hero = document.getElementById('hero').value;
  const stat = statSelect.value;
  const baseH = CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT
    ? parseInt(document.getElementById('baseHealth').value, 10) : 0;
  const baseS = CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT
    ? parseInt(document.getElementById('baseShield').value, 10) : 0;
  const baseA = CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT
    ? parseInt(document.getElementById('baseArmor').value, 10) : 0;

  const useAll = document.getElementById('useAllSlots').checked;
  const slotStats = useAll ? Array(CONSTANTS.MAX_ITEMS).fill(stat)
    : Array.from({length: CONSTANTS.MAX_ITEMS}, (_, i) => {
        const val = document.getElementById(`slot${i+1}`).value;
        return val || stat;
      });
  
  // Calculate available cash after reserves
  const availableCash = Math.max(0, cash - totalReserve);
  
  // Perform calculation
  let result;
  if (useAll) {
    result = calcFns.search({
      items: state.items,
      cash: availableCash,
      hero,
      stat,
      baseH,
      baseS,
      baseA,
      maxItems: CONSTANTS.MAX_ITEMS
    });
    ui.renderResults(result, { stat, baseH, baseS, baseA, totalReserve });
  } else {
    result = calcFns.searchSlots({
      items: state.items,
      cash: availableCash,
      hero,
      slotStats,
      baseH,
      baseS,
      baseA
    });
    ui.renderSlotResults(result, { slotStats });
  }
}

// Data loading
async function loadData() {
  document.getElementById('loading').textContent = "Loading data...";
  
  try {
    const resp = await fetch('https://raw.githubusercontent.com/legovader09/OW-Stadium-Build-Planner/0443f4550d3640231832a4c16c9d8a185091d7d8/public/static/data/data-original.json');
    
    if (!resp.ok) {
      throw new Error("Failed to fetch data");
    }
    
    state.data = await resp.json();
    state.items = dataFns.getAllItems(state.data);
    state.heroes = dataFns.getHeroList(state.items);
    
    ui.populateStatOptions(dataFns.getStatTypes(state.items));
    ui.populateHeroes();
    
    document.getElementById('loading').textContent = "";
  } catch (error) {
    document.getElementById('loading').textContent = "Failed to load data.";
    console.error("Error loading data:", error);
  }
}

// Event listeners
document.getElementById('calculate').addEventListener('click', doCalculate);
document.getElementById('cash').addEventListener('keydown', e => {
  if (e.key === "Enter") doCalculate();
});
document.getElementById('stat').addEventListener('change', ui.showBaseHPIfNeeded);
document.getElementById('useAllSlots').addEventListener('change', e => {
  document.getElementById('slotSelects').style.display = e.target.checked ? 'none' : 'block';
});

// Initialize the app
loadData();
