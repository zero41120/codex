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
  const reserveIds = [1, 2, 3, 4, 5].map(i => document.getElementById('reserve' + i).value);
  const totalReserve = reserveIds.reduce((sum, id) => {
    const item = state.items.find(it => it.id === id);
    return sum + (item ? item.cost : 0);
  }, 0);
  const hero = document.getElementById('hero').value;
  const stat = statSelect.value;
  const baseH = CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT 
    ? parseInt(document.getElementById('baseHealth').value, 10) : 0;
  const baseS = CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT 
    ? parseInt(document.getElementById('baseShield').value, 10) : 0;
  const baseA = CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT 
    ? parseInt(document.getElementById('baseArmor').value, 10) : 0;
  const maxItems = Math.min(Math.max(parseInt(document.getElementById('maxItems').value, 10) || 5, 1), CONSTANTS.MAX_ITEMS);
  const useAll = document.getElementById('useAllSlots').checked;

  const slotConfig = [];
  if (!useAll) {
    for (let i = 1; i <= 6; i++) {
      const val = document.getElementById('slot' + i).value;
      const weight = parseFloat(document.getElementById('weight' + i).value) || 0;
      slotConfig.push({ stat: val === 'main' ? stat : val, weight });
    }
  }
  
  // Calculate available cash after reserves
  const availableCash = Math.max(0, cash - totalReserve);
  
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
      maxItems: 6
    });
    ui.renderResults(result, { stat, baseH, baseS, baseA, totalReserve, hero });
  } else {
    result = calcFns.searchWeighted({
      items: state.items,
      cash: availableCash,
      hero,
      slots: slotConfig,
      baseH,
      baseS,
      baseA
    });
    ui.renderMultiStatResults(result, { baseH, baseS, baseA, hero });
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
    ui.populateReserveSelectors();
    
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
document.getElementById('stat').addEventListener('change', () => {
  ui.showBaseHPIfNeeded();
  ui.populateSlotSelectors();
});
document.getElementById('useAllSlots').addEventListener('change', () => {
  document.getElementById('slotConfig').style.display = document.getElementById('useAllSlots').checked ? 'none' : '';
});
document.getElementById('hero').addEventListener('change', () => {
  ui.populateReserveSelectors();
});

// Initialize the app
loadData();
