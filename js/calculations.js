import { CONSTANTS } from './constants.js';
import * as dataFns from './dataFunctions.js';
import * as util from './utils.js';

export const calcFns = {
  // Unified search function for all stat types
  search: (params) => {
    const { items, cash, hero, stat, baseH, baseS, baseA, maxItems } = params;
    const { HP_STATS, HIT_POINT_STAT, WEAPON_EFFECT_STAT } = CONSTANTS;
    
    // Filter relevant items
    const relevant = items.filter(it => 
      hero === "All" ? !it.character : !it.character || it.character === hero
    );
    
    // Handle special stat types
    if (stat === HIT_POINT_STAT) {
      return calcFns.calculateHitPointCombo(relevant, cash, baseH, baseS, baseA, maxItems);
    }
    
    if (stat === WEAPON_EFFECT_STAT) {
      return calcFns.calculateWeaponEffectCombo(relevant, cash, hero, maxItems);
    }
    
    if (HP_STATS.includes(stat)) {
      return calcFns.calculateHPStatCombo(relevant, cash, stat, 
        stat === "Health" ? baseH : stat === "Shield" ? baseS : baseA, maxItems);
    }
    
    // Standard stat search
    const statItems = relevant
      .map(it => {
        const v = dataFns.getStatValue(it, hero, stat);
        return v > 0 ? {...it, statValue: v} : null;
      })
      .filter(Boolean);
    
    let max = 0;
    let bestCombos = [];
    
    const searchRecursive = (i, curCash, curStat, picked) => {
      if (picked.length > maxItems) return;
      
      if (i >= statItems.length) {
        if (curStat > max) {
          max = curStat;
          bestCombos = [{items: [...picked], cost: curCash}];
        } else if (curStat === max && max > 0 && !bestCombos.some(c => util.arraysEqual(c.items, picked))) {
          bestCombos.push({items: [...picked], cost: curCash});
        }
        return;
      }
      
      // Skip this item
      searchRecursive(i + 1, curCash, curStat, picked);
      
      // Take this item if we can afford it
      const item = statItems[i];
      if (curCash + item.cost <= cash) {
        picked.push(item);
        searchRecursive(i + 1, curCash + item.cost, curStat + item.statValue, picked);
        picked.pop();
      }
    };
    
    searchRecursive(0, 0, 0, []);
    
    if (!bestCombos.length) {
      return { max: 0, picked: [], alternatives: [] };
    }
    
    const minCost = Math.min(...bestCombos.map(c => c.cost));
    const best = bestCombos.filter(c => c.cost === minCost);
    const alternatives = bestCombos.filter(c => c.cost > minCost);
    
    return {
      max,
      picked: best[0].items,
      bestCost: best[0].cost,
      alternatives
    };
  },
  
  calculateHitPointCombo: (relevant, cash, baseH, baseS, baseA, maxItems) => {
    const hpItems = relevant.filter(it => 
      it.attributes?.some(a => CONSTANTS.HP_STATS.includes(a.type))
    );
    
    let max = 0;
    let bestCombos = [];
    
    const searchRecursive = (i, curCash, picked) => {
      if (picked.length > maxItems) return;
      
      if (i >= hpItems.length) {
        const perType = {
          Health: dataFns.getHPStatValueCombo(picked, "Health", baseH),
          Shield: dataFns.getHPStatValueCombo(picked, "Shield", baseS),
          Armor: dataFns.getHPStatValueCombo(picked, "Armor", baseA)
        };
        
        const sum = perType.Health.total + perType.Shield.total + perType.Armor.total - (baseH + baseS + baseA);
        
        if (sum > max) {
          max = sum;
          bestCombos = [{
            items: [...picked],
            cost: curCash,
            perType,
            total: perType.Health.total + perType.Shield.total + perType.Armor.total
          }];
        } else if (sum === max && max > 0 && !bestCombos.some(c => util.arraysEqual(c.items, picked))) {
          bestCombos.push({
            items: [...picked],
            cost: curCash,
            perType,
            total: perType.Health.total + perType.Shield.total + perType.Armor.total
          });
        }
        return;
      }
      
      // Skip this item
      searchRecursive(i + 1, curCash, picked);
      
      // Take this item if we can afford it
      const item = hpItems[i];
      if (curCash + item.cost <= cash) {
        picked.push(item);
        searchRecursive(i + 1, curCash + item.cost, picked);
        picked.pop();
      }
    };
    
    searchRecursive(0, 0, []);
    
    if (!bestCombos.length) {
      return {
        max: 0,
        picked: [],
        alternatives: [],
        total: baseH + baseS + baseA,
        perType: {
          Health: { total: baseH },
          Shield: { total: baseS },
          Armor: { total: baseA }
        }
      };
    }
    
    const minCost = Math.min(...bestCombos.map(c => c.cost));
    const best = bestCombos.filter(c => c.cost === minCost);
    const alternatives = bestCombos.filter(c => c.cost > minCost);
    
    return {
      max,
      picked: best[0].items,
      bestCost: best[0].cost,
      alternatives,
      total: best[0].total,
      perType: best[0].perType
    };
  },
  
  calculateWeaponEffectCombo: (relevant, cash, hero, maxItems) => {
    const effectItems = relevant.filter(it => {
      let hasEffect = it.attributes?.some(a => ["WP", "AS"].includes(a.type));
      if (hero === "Ashe" && it.name && ["TRIPOD", "IRONSIGHTS"].includes(it.name.toUpperCase())) {
        hasEffect = true;
      }
      return hasEffect;
    });
    
    let max = 0;
    let bestCombos = [];
    
    const getEffectStats = (picked) => {
      let wp = 0, as = 0;
      
      picked.forEach(it => {
        if (hero === "Ashe") {
          if (it.name?.toUpperCase() === "TRIPOD") wp += 13;
          if (it.name?.toUpperCase() === "IRONSIGHTS") wp += 20;
        }
        
        it.attributes?.forEach(a => {
          if (a.type === "WP") wp += util.parsePercent(a.value);
          if (a.type === "AS") as += util.parsePercent(a.value);
        });
      });
      
      return { wp, as };
    };
    
    const searchRecursive = (i, curCash, picked) => {
      if (picked.length > maxItems) return;
      
      if (i >= effectItems.length) {
        const { wp, as } = getEffectStats(picked);
        const effect = (1 + wp / 100) * (1 + as / 100);
        
        if (effect > max) {
          max = effect;
          bestCombos = [{ items: [...picked], cost: curCash, wp, as, effect }];
        } else if (effect === max && max > 1 && !bestCombos.some(c => util.arraysEqual(c.items, picked))) {
          bestCombos.push({ items: [...picked], cost: curCash, wp, as, effect });
        }
        return;
      }
      
      // Skip this item
      searchRecursive(i + 1, curCash, picked);
      
      // Take this item if we can afford it
      const item = effectItems[i];
      if (curCash + item.cost <= cash) {
        picked.push(item);
        searchRecursive(i + 1, curCash + item.cost, picked);
        picked.pop();
      }
    };
    
    searchRecursive(0, 0, []);
    
    if (!bestCombos.length) {
      return { max: 1, picked: [], alternatives: [], wp: 0, as: 0 };
    }
    
    const minCost = Math.min(...bestCombos.map(c => c.cost));
    const best = bestCombos.filter(c => c.cost === minCost);
    const alternatives = bestCombos.filter(c => c.cost > minCost);
    
    return {
      max: best[0].effect,
      picked: best[0].items,
      bestCost: best[0].cost,
      alternatives,
      wp: best[0].wp,
      as: best[0].as
    };
  },
  
  calculateHPStatCombo: (relevant, cash, stat, base, maxItems) => {
    const statItems = relevant.filter(it => 
      it.attributes?.some(a => a.type === stat)
    );
    
    let max = 0;
    let bestCombos = [];
    
    const searchRecursive = (i, curCash, picked) => {
      if (picked.length > maxItems) return;
      
      if (i >= statItems.length) {
        const { total, plus } = dataFns.getHPStatValueCombo(picked, stat, base);
        
        if (plus > max) {
          max = plus;
          bestCombos = [{ items: [...picked], cost: curCash, total, plus }];
        } else if (plus === max && max > 0 && !bestCombos.some(c => util.arraysEqual(c.items, picked))) {
          bestCombos.push({ items: [...picked], cost: curCash, total, plus });
        }
        return;
      }
      
      // Skip this item
      searchRecursive(i + 1, curCash, picked);
      
      // Take this item if we can afford it
      const item = statItems[i];
      if (curCash + item.cost <= cash) {
        picked.push(item);
        searchRecursive(i + 1, curCash + item.cost, picked);
        picked.pop();
      }
    };
    
    searchRecursive(0, 0, []);
    
    if (!bestCombos.length) {
      return { max: 0, picked: [], alternatives: [], total: base };
    }
    
    const minCost = Math.min(...bestCombos.map(c => c.cost));
    const best = bestCombos.filter(c => c.cost === minCost);
    const alternatives = bestCombos.filter(c => c.cost > minCost);
    
    return {
      max,
      picked: best[0].items,
      bestCost: best[0].cost,
      alternatives,
      total: best[0].total
    };
  },

  // New search allowing custom stat per slot
  searchSlots: (params) => {
    const { items, cash, hero, slotStats, baseH, baseS, baseA } = params;
    const { HP_STATS, HIT_POINT_STAT, WEAPON_EFFECT_STAT } = CONSTANTS;

    const hasStat = (item, stat) => {
      if (stat === HIT_POINT_STAT) {
        return item.attributes?.some(a => HP_STATS.includes(a.type));
      }
      if (stat === WEAPON_EFFECT_STAT) {
        let ok = item.attributes?.some(a => ["WP", "AS"].includes(a.type));
        if (hero === "Ashe" && item.name) {
          const up = item.name.toUpperCase();
          if (up === "TRIPOD" || up === "IRONSIGHTS") ok = true;
        }
        return ok;
      }
      return item.attributes?.some(a => a.type === stat);
    };

    const relevant = items.filter(it =>
      (hero === "All" ? !it.character : !it.character || it.character === hero) &&
      slotStats.some(stat => hasStat(it, stat))
    );

    const candidates = slotStats.map(stat => relevant.filter(it => hasStat(it, stat)));

    let bestScore = -Infinity;
    let bestCost = Infinity;
    let bestPicked = [];
    let bestPerStat = {};

    const evalCombo = picked => {
      const perStat = {};
      slotStats.forEach((stat, i) => {
        perStat[stat] = perStat[stat] || [];
        perStat[stat].push(picked[i]);
      });

      let score = 0;
      const detail = {};

      for (const [stat, list] of Object.entries(perStat)) {
        if (stat === HIT_POINT_STAT) {
          const perType = {
            Health: dataFns.getHPStatValueCombo(list, "Health", baseH),
            Shield: dataFns.getHPStatValueCombo(list, "Shield", baseS),
            Armor: dataFns.getHPStatValueCombo(list, "Armor", baseA)
          };
          const total = perType.Health.total + perType.Shield.total + perType.Armor.total;
          const plus = total - (baseH + baseS + baseA);
          detail[stat] = { total, plus, perType };
          score += plus;
        } else if (stat === WEAPON_EFFECT_STAT) {
          let wp = 0, as = 0;
          list.forEach(it => {
            if (hero === "Ashe") {
              if (it.name?.toUpperCase() === "TRIPOD") wp += 13;
              if (it.name?.toUpperCase() === "IRONSIGHTS") wp += 20;
            }
            it.attributes?.forEach(a => {
              if (a.type === "WP") wp += util.parsePercent(a.value);
              if (a.type === "AS") as += util.parsePercent(a.value);
            });
          });
          const effect = (1 + wp / 100) * (1 + as / 100);
          detail[stat] = { wp, as, effect };
          score += (effect - 1) * 100;
        } else if (HP_STATS.includes(stat)) {
          const base = stat === "Health" ? baseH : stat === "Shield" ? baseS : baseA;
          const { plus, total } = dataFns.getHPStatValueCombo(list, stat, base);
          detail[stat] = { plus, total };
          score += plus;
        } else {
          const val = list.reduce((n, it) => n + dataFns.getStatValue(it, hero, stat), 0);
          detail[stat] = { plus: val };
          score += val;
        }
      }

      return { score, detail };
    };

    const searchRec = (i, used, curCost, picked) => {
      if (i >= slotStats.length) {
        const { score, detail } = evalCombo(picked);
        if (score > bestScore || (score === bestScore && curCost < bestCost)) {
          bestScore = score;
          bestCost = curCost;
          bestPicked = [...picked];
          bestPerStat = detail;
        }
        return;
      }

      for (const it of candidates[i]) {
        if (used.has(it.id)) continue;
        const cost = curCost + it.cost;
        if (cost > cash) continue;
        used.add(it.id);
        picked[i] = it;
        searchRec(i + 1, used, cost, picked);
        used.delete(it.id);
      }
    };

    searchRec(0, new Set(), 0, new Array(slotStats.length));

    return {
      max: bestScore,
      picked: bestPicked,
      bestCost: bestCost,
      perStat: bestPerStat
    };
  }
};
