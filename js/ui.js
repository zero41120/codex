import { CONSTANTS } from './constants.js';
import { state } from './state.js';
import * as util from './utils.js';

export const ui = {
  populateStatOptions: (stats) => {
    const select = document.getElementById('stat');
    select.innerHTML = "";
    
    stats.forEach(stat => {
      const option = document.createElement('option');
      option.value = stat;
      option.textContent = CONSTANTS.STAT_DISPLAY_NAMES[stat] || stat;
      select.appendChild(option);
    });
    
    select.disabled = !stats.length;
    ui.showBaseHPIfNeeded();
    ui.populateSlotSelectors(stats);
  },
  
  populateHeroes: () => {
    const select = document.getElementById('hero');
    select.innerHTML = "";
    
    state.heroes.forEach(hero => {
      const option = document.createElement('option');
      option.value = hero;
      option.textContent = hero;
      select.appendChild(option);
    });
  },
  
  showBaseHPIfNeeded: () => {
    const stat = document.getElementById('stat').value;
    document.getElementById('baseStats-label').style.display = 
      CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT ? "" : "none";
  },

  populateSlotSelectors: (stats) => {
    for (let i = 1; i <= CONSTANTS.MAX_ITEMS; i++) {
      const select = document.getElementById(`slot${i}`);
      if (!select) continue;
      select.innerHTML = '';
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Use main selection';
      select.appendChild(opt);
      stats.forEach(stat => {
        const o = document.createElement('option');
        o.value = stat;
        o.textContent = CONSTANTS.STAT_DISPLAY_NAMES[stat] || stat;
        select.appendChild(o);
      });
    }
  },

  renderSlotResults: (result, params) => {
    const { slotStats } = params;
    let html = `<div>Total cost: <span style="color:#4db6ac">${result.bestCost || 0} cash</span></div>`;

    html += '<div class="item-list"><b>Items:</b><ul>';
    result.picked.forEach((item, idx) => {
      const priceClass = util.getPriceClass(item.cost);
      const statLabel = CONSTANTS.STAT_DISPLAY_NAMES[slotStats[idx]] || slotStats[idx];
      html += `<li class="${priceClass}">${item.name} <span style="color:#555;font-size:.94em">(${statLabel}, ${item.cost} cash)</span></li>`;
    });
    html += '</ul></div>';

    document.getElementById('result').innerHTML = html;
  },
  
  renderResults: (result, params) => {
    const { stat, baseH, baseS, baseA, totalReserve } = params;
    const { HIT_POINT_STAT, WEAPON_EFFECT_STAT, HP_STATS, STAT_DISPLAY_NAMES } = CONSTANTS;
    
    const statLabel = STAT_DISPLAY_NAMES[stat] || stat;
    let html = "";
    
    if (stat === HIT_POINT_STAT) {
      html = `
        <div>Max <b>${statLabel}</b> achievable: <span style="color: #2196f3">+${util.roundInt(result.max)}</span> 
          (Total: <b>${util.roundInt(result.total)}</b>, base: ${util.roundInt(baseH + baseS + baseA)}, 
          <span style="color:#4db6ac">${result.bestCost || 0} cash</span>)
        </div>
        <div>Breakdown: 
          <span style="color:#2196f3">Health</span> <b>${util.roundInt(result.perType.Health.total)}</b> + 
          <span style="color:#a020cf">Armor</span> <b>${util.roundInt(result.perType.Armor.total)}</b> + 
          <span style="color:#20baa2">Shield</span> <b>${util.roundInt(result.perType.Shield.total)}</b>
        </div>
      `;
    } else if (stat === WEAPON_EFFECT_STAT) {
      const percentIncrease = ((result.max - 1) * 100).toFixed(2);
      html = `
        <div>Max <b>${statLabel}</b> achievable: <span style="color:#20baa2">+${percentIncrease}%</span> 
          (WP: +${result.wp}%, AS: +${result.as}%, <span style="color:#4db6ac">${result.bestCost || 0} cash</span>)
        </div>
      `;
    } else if (HP_STATS.includes(stat)) {
      const baseValue = stat === "Health" ? baseH : stat === "Shield" ? baseS : baseA;
      html = `
        <div>Max <b>${statLabel}</b> achievable: <span style="color:#2196f3">+${util.roundInt(result.max)}</span> 
          (Total: <b>${util.roundInt(result.total)}</b>, base: ${util.roundInt(baseValue)}, 
          <span style="color:#4db6ac">${result.bestCost || 0} cash</span>)
        </div>
      `;
    } else {
      html = `
        <div>Max <b>${statLabel}</b> achievable: <span style="color:#20baa2">${result.max}%</span> 
          (<span style="color:#4db6ac">${result.bestCost || 0} cash</span>)
        </div>
      `;
    }
    
    if (result.picked.length) {
      html += `<div class="item-list"><b>Picked items:</b><ul>`;
      
      result.picked.forEach(item => {
        const priceClass = util.getPriceClass(item.cost);
        let statValue = "";
        
        if (stat === HIT_POINT_STAT) {
          const statParts = [];
          
          HP_STATS.forEach(hpStat => {
            let flat = 0, percent = 0;
            
            item.attributes?.forEach(attr => {
              if (attr.type === hpStat) {
                if (typeof attr.value === "string" && attr.value.endsWith("%")) {
                  percent += util.parsePercent(attr.value);
                } else {
                  flat += (+attr.value || 0);
                }
              }
            });
            
            if (flat) statParts.push(`${hpStat}: +${flat}`);
            if (percent) statParts.push(`${hpStat}: +${percent}%`);
          });
          
          statValue = statParts.join(" | ");
        } else if (stat === WEAPON_EFFECT_STAT) {
          let wp = 0, as = 0;
          
          if (params.hero === "Ashe") {
            if (item.name?.toUpperCase() === "TRIPOD") wp += 13;
            if (item.name?.toUpperCase() === "IRONSIGHTS") wp += 20;
          }
          
          item.attributes?.forEach(attr => {
            if (attr.type === "WP") wp += util.parsePercent(attr.value);
            if (attr.type === "AS") as += util.parsePercent(attr.value);
          });
          
          const parts = [];
          if (wp) parts.push(`WP: +${wp}%`);
          if (as) parts.push(`AS: +${as}%`);
          statValue = parts.join(" & ");
        } else if (HP_STATS.includes(stat)) {
          let flat = 0, percent = 0;
          
          item.attributes?.forEach(attr => {
            if (attr.type === stat) {
              if (typeof attr.value === "string" && attr.value.endsWith("%")) {
                percent += util.parsePercent(attr.value);
              } else {
                flat += (+attr.value || 0);
              }
            }
          });
          
          const parts = [];
          if (flat) parts.push(`+${flat}`);
          if (percent) parts.push(`+${percent}%`);
          statValue = parts.length ? parts.join(" & ") : "";
        } else {
          statValue = `+${item.statValue}%`;
        }
        
        html += `
          <li class="${priceClass}">
            ${item.name} 
            <span style="color:#555;font-size:.94em">
              (${item.cost} cash, ${statValue}${item.character ? ', ' + item.character : ''})
            </span>
          </li>
        `;
      });
      
      html += `</ul></div>`;
    } else {
      html += "<div style='color:#ea4f4f'>No items found for this combination.</div>";
    }
    
    if (result.alternatives?.length > 0) {
      html += `<div class="alt-list"><b>Alternative combinations (same value, different cost):</b><ul>`;
      
      result.alternatives.forEach(combo => {
        html += `<li>
          ${combo.items.map(item => {
            const priceClass = util.getPriceClass(item.cost);
            return `<span class="${priceClass}">${item.name}</span>`;
          }).join(' + ')} 
          (${combo.cost} cash)
        </li>`;
      });
      
      html += `</ul></div>`;
    }
    
    document.getElementById('result').innerHTML = html;
  }
};
