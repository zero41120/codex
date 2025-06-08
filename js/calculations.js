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

  searchMulti: (params) => {
    const { items, cash, hero, stats, baseH, baseS, baseA } = params;
    const counts = {};
    stats.forEach(s => counts[s] = (counts[s] || 0) + 1);
    const uniqueStats = Object.keys(counts);

    const permute = (arr) => {
      if (arr.length <= 1) return [arr];
      const res = [];
      arr.forEach((val, idx) => {
        const rest = [...arr.slice(0, idx), ...arr.slice(idx + 1)];
        permute(rest).forEach(p => res.push([val, ...p]));
      });
      return res;
    };

    const perms = permute(uniqueStats);
    let bestScore = -Infinity;
    let best = { order: uniqueStats, perStat: {} };

    const scoreResult = (res, stat) => {
      if (stat === CONSTANTS.WEAPON_EFFECT_STAT) return (res.max - 1) * 100;
      return res.max;
    };

    perms.forEach(order => {
      let remainingItems = [...items];
      let remainingCash = cash;
      const perStat = {};
      let totalScore = 0;

      for (const stat of order) {
        const res = calcFns.search({
          items: remainingItems,
          cash: remainingCash,
          hero,
          stat,
          baseH,
          baseS,
          baseA,
          maxItems: counts[stat]
        });

        perStat[stat] = res;
        remainingCash -= res.bestCost || 0;
        remainingItems = remainingItems.filter(it => !res.picked.some(p => p.id === it.id));
        totalScore += scoreResult(res, stat);
      }

      if (totalScore > bestScore) {
        bestScore = totalScore;
        best = { order, perStat };
      }
    });

    return best;
  },

  searchWeighted: (params) => {
    const { items, cash, hero, slots, baseH, baseS, baseA } = params;
    const counts = {};
    const weightMap = {};

    slots.forEach(({ stat, weight }) => {
      counts[stat] = (counts[stat] || 0) + 1;
      weightMap[stat] = (weightMap[stat] || 0) + weight;
    });

    const uniqueStats = Object.keys(counts);
    const totalWeight = Object.values(weightMap).reduce((a, b) => a + b, 0) || 1;
    const budgets = {};
    uniqueStats.forEach(s => {
      budgets[s] = cash * (weightMap[s] / totalWeight);
    });

    const permute = (arr) => {
      if (arr.length <= 1) return [arr];
      const res = [];
      arr.forEach((val, idx) => {
        const rest = [...arr.slice(0, idx), ...arr.slice(idx + 1)];
        permute(rest).forEach(p => res.push([val, ...p]));
      });
      return res;
    };

    const perms = permute(uniqueStats);
    let bestScore = -Infinity;
    let best = { order: uniqueStats, perStat: {} };

    const scoreResult = (res, stat) => {
      if (stat === CONSTANTS.WEAPON_EFFECT_STAT) return (res.max - 1) * 100;
      return res.max;
    };

    perms.forEach(order => {
      let remainingItems = [...items];
      let remainingCash = cash;
      const perStat = {};
      let totalScore = 0;

      for (const stat of order) {
        if (remainingCash <= 0) break;
        const allowed = Math.min(remainingCash, budgets[stat] * 1.2);
        const res = calcFns.search({
          items: remainingItems,
          cash: allowed,
          hero,
          stat,
          baseH,
          baseS,
          baseA,
          maxItems: counts[stat]
        });

        perStat[stat] = res;
        remainingCash -= res.bestCost || 0;
        remainingItems = remainingItems.filter(it => !res.picked.some(p => p.id === it.id));
        totalScore += scoreResult(res, stat);
      }

      if (totalScore > bestScore) {
        bestScore = totalScore;
        best = { order, perStat };
      }
    });

    return best;
  }
};
