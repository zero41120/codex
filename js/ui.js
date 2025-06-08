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
    ui.populateSlotSelectors();
    ui.populateComboSelectors();
    ui.showCustomComboIfNeeded();
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
      CONSTANTS.HP_STATS.includes(stat) || stat === CONSTANTS.HIT_POINT_STAT || stat === CONSTANTS.CUSTOM_WEIGHTED_STAT ? "" : "none";
  },

  showCustomComboIfNeeded: () => {
    const stat = document.getElementById('stat').value;
    document.getElementById('customCombo').style.display = stat === CONSTANTS.CUSTOM_WEIGHTED_STAT ? '' : 'none';
  },

  populateSlotSelectors: () => {
    const mainStat = document.getElementById('stat').value;
    const selects = document.querySelectorAll('.slot-select');
    const stats = Array.from(document.getElementById('stat').options).map(o => o.value);
    selects.forEach(sel => {
      const prev = sel.value;
      sel.innerHTML = '';
      const optMain = document.createElement('option');
      optMain.value = 'main';
      optMain.textContent = `Use main selection (${CONSTANTS.STAT_DISPLAY_NAMES[mainStat] || mainStat})`;
      sel.appendChild(optMain);
      stats.forEach(stat => {
        const op = document.createElement('option');
        op.value = stat;
        op.textContent = CONSTANTS.STAT_DISPLAY_NAMES[stat] || stat;
        sel.appendChild(op);
      });
      sel.value = Array.from(sel.options).some(o => o.value === prev) ? prev : 'main';
    });
  },

  populateComboSelectors: () => {
    const stats = Array.from(document.getElementById('stat').options)
      .map(o => o.value)
      .filter(s => s !== CONSTANTS.CUSTOM_WEIGHTED_STAT);
    const selects = document.querySelectorAll('.combo-select');
    selects.forEach(sel => {
      const prev = sel.value;
      sel.innerHTML = '';
      stats.forEach(stat => {
        const op = document.createElement('option');
        op.value = stat;
        op.textContent = CONSTANTS.STAT_DISPLAY_NAMES[stat] || stat;
        sel.appendChild(op);
      });
      sel.value = stats.includes(prev) ? prev : stats[0];
    });
  },

  populateReserveSelectors: () => {
    const hero = document.getElementById('hero').value;
    const selects = document.querySelectorAll('.reserve-select');
    const items = [...state.items];

    items.sort((a, b) => {
      const aMatch = hero === 'All' ? !a.character : a.character === hero;
      const bMatch = hero === 'All' ? !b.character : b.character === hero;
      if (aMatch !== bMatch) return aMatch ? -1 : 1;
      if (a.cost !== b.cost) return a.cost - b.cost;
      return a.name.localeCompare(b.name);
    });

    const getAttrInfo = (attrs = []) =>
      attrs
        .filter(at => at.type !== 'description')
        .map(at => `${at.type} ${at.value}`)
        .join(', ');

    selects.forEach(sel => {
      const prev = sel.value;
      sel.innerHTML = '';
      const noneOpt = document.createElement('option');
      noneOpt.value = '';
      noneOpt.textContent = 'None';
      sel.appendChild(noneOpt);
      items.forEach(item => {
        const op = document.createElement('option');
        op.value = item.id;
        const info = getAttrInfo(item.attributes);
        op.textContent = `${item.cost} - ${item.name}${info ? ' - ' + info : ''}`;
        sel.appendChild(op);
      });
      sel.value = Array.from(sel.options).some(o => o.value === prev) ? prev : '';
    });
  },

  renderResultString: (result, params) => {
    const { stat, baseH, baseS, baseA, hero } = params;
    const { HIT_POINT_STAT, WEAPON_EFFECT_STAT, CUSTOM_WEIGHTED_STAT, HP_STATS, STAT_DISPLAY_NAMES } = CONSTANTS;

    const statLabel = STAT_DISPLAY_NAMES[stat] || stat;
    let html = '';

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
    } else if (stat === CUSTOM_WEIGHTED_STAT) {
      const parts = Object.keys(result.perStat || {}).map(s => {
        return `${STAT_DISPLAY_NAMES[s] || s}: +${result.perStat[s]}%`;
      }).join(', ');
      html = `
        <div>Max <b>${statLabel}</b> achievable: <span style="color:#20baa2">${result.max}</span>
          (${parts}${parts ? ',' : ''} <span style="color:#4db6ac">${result.bestCost || 0} cash</span>)
        </div>
      `;
    } else if (HP_STATS.includes(stat)) {
      const baseValue = stat === 'Health' ? baseH : stat === 'Shield' ? baseS : baseA;
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
        let statValue = '';

        if (stat === HIT_POINT_STAT) {
          const statParts = [];

          HP_STATS.forEach(hpStat => {
            let flat = 0, percent = 0;

            item.attributes?.forEach(attr => {
              if (attr.type === hpStat) {
                if (typeof attr.value === 'string' && attr.value.endsWith('%')) {
                  percent += util.parsePercent(attr.value);
                } else {
                  flat += (+attr.value || 0);
                }
              }
            });

            if (flat) statParts.push(`${hpStat}: +${flat}`);
            if (percent) statParts.push(`${hpStat}: +${percent}%`);
          });

          statValue = statParts.join(' | ');
        } else if (stat === WEAPON_EFFECT_STAT) {
          let wp = 0, as = 0;

          if (hero === 'Ashe') {
            if (item.name?.toUpperCase() === 'TRIPOD') wp += 13;
            if (item.name?.toUpperCase() === 'IRONSIGHTS') wp += 20;
          }

          item.attributes?.forEach(attr => {
            if (attr.type === 'WP') wp += util.parsePercent(attr.value);
            if (attr.type === 'AS') as += util.parsePercent(attr.value);
          });

          const parts = [];
          if (wp) parts.push(`WP: +${wp}%`);
          if (as) parts.push(`AS: +${as}%`);
          statValue = parts.join(' & ');
        } else if (stat === CUSTOM_WEIGHTED_STAT) {
          const parts = Object.keys(result.perStat || {}).map(s =>
            `${STAT_DISPLAY_NAMES[s] || s}: +${result.perStat[s]}%`
          );
          statValue = parts.join(' | ');
        } else if (HP_STATS.includes(stat)) {
          let flat = 0, percent = 0;

          item.attributes?.forEach(attr => {
            if (attr.type === stat) {
              if (typeof attr.value === 'string' && attr.value.endsWith('%')) {
                percent += util.parsePercent(attr.value);
              } else {
                flat += (+attr.value || 0);
              }
            }
          });

          const parts = [];
          if (flat) parts.push(`+${flat}`);
          if (percent) parts.push(`+${percent}%`);
          statValue = parts.length ? parts.join(' & ') : '';
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

    return html;
  },

  renderResults: (result, params) => {
    const html = ui.renderResultString(result, params);
    document.getElementById('result').innerHTML = html;
  },

  renderMultiStatResults: (resultMap, params) => {
    let html = '';
    resultMap.order.forEach((stat, idx) => {
      if (idx > 0) html += '<hr />';
      html += ui.renderResultString(resultMap.perStat[stat], { ...params, stat });
    });
    document.getElementById('result').innerHTML = html;
  }
};
