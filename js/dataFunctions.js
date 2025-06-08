import { CONSTANTS } from './constants.js';
import * as util from "./utils.js";

export const getAllItems = d => {
  let result = [];
  for (let tabKey in d.tabs) {
    ["common", "rare", "epic"].forEach(quality => {
      d.tabs[tabKey][quality]?.forEach(item => result.push(item));
    });
  }
  return result;
};

export const getHeroList = items => {
  const set = new Set(["All"]);
  items.forEach(i => i.character && set.add(i.character));
  return [...set].sort();
};

export const getStatTypes = items => {
  const counts = {};
  const always = ["WP", "AP", "AS"];
  const { HP_STATS, HIT_POINT_STAT, WEAPON_EFFECT_STAT, CUSTOM_WEIGHTED_STAT } = CONSTANTS;

  items.forEach(item => {
    item.attributes?.forEach(attr => {
      const type = attr.type;
      if (
        typeof type === "string" &&
        type !== "description" &&
        type !== "" &&
        !type.startsWith("Max ") &&
        !type.startsWith("[")
      ) {
        counts[type] = (counts[type] || 0) + 1;
      }
    });
  });

  counts.WP = counts.WP || 0;

  let statList = Object.keys(counts).filter(stat =>
    always.includes(stat) ? counts[stat] > 0 : counts[stat] >= 3
  );

  const hpCount = HP_STATS.reduce((n, s) => n + (counts[s] || 0), 0);
  if (hpCount >= 3) statList.push(HIT_POINT_STAT);

  const wpCount = counts.WP || 0;
  const asCount = counts.AS || 0;
  if (wpCount + asCount >= 3) statList.push(WEAPON_EFFECT_STAT);

  return [
    ...always.filter(s => statList.includes(s)),
    ...statList.filter(
      s => !always.includes(s) && s !== HIT_POINT_STAT && s !== WEAPON_EFFECT_STAT
    ).sort(),
    ...(statList.includes(HIT_POINT_STAT) ? [HIT_POINT_STAT] : []),
    ...(statList.includes(WEAPON_EFFECT_STAT) ? [WEAPON_EFFECT_STAT] : []),
    CUSTOM_WEIGHTED_STAT
  ];
};

export const getStatValue = (item, hero, stat) => {
  if (hero === "Ashe" && stat === "WP") {
    if (item.name?.toUpperCase() === "TRIPOD") return 13;
    if (item.name?.toUpperCase() === "IRONSIGHTS") return 20;
  }

  let value = 0;
  item.attributes?.forEach(attr => {
    if (attr.type === stat) value += util.parsePercent(attr.value);
  });

  return value;
};

export const getHPStatValueCombo = (items, stat, base) => {
  let flat = 0,
    percent = 0;

  items.forEach(item => {
    item.attributes?.forEach(attr => {
      if (attr.type === stat) {
        if (typeof attr.value === "string" && attr.value.endsWith("%")) {
          percent += util.parsePercent(attr.value);
        } else {
          flat += +attr.value || 0;
        }
      }
    });
  });

  const total = (base + flat) * (1 + percent / 100);
  const plus = total - base;

  return { total, plus, flat, percent };
};
