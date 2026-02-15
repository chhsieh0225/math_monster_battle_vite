/**
 * Achievement definitions.
 * Each entry is purely declarative — checking logic lives in useBattle.
 */
export const ACHIEVEMENTS = [
  { id:"first_win",     name:"初心者",     icon:"🎮", desc:"擊敗第一隻怪獸" },
  { id:"streak_5",      name:"連擊高手",   icon:"🔥", desc:"單局連擊達 5" },
  { id:"streak_10",     name:"連擊王",     icon:"💥", desc:"單局連擊達 10" },
  { id:"perfect",       name:"全對通關",   icon:"✅", desc:"通關且零失誤" },
  { id:"timed_clear",   name:"計時征服者", icon:"⏱️", desc:"計時模式通關" },
  { id:"one_hit",       name:"秒殺",       icon:"⚡", desc:"一擊打倒敵人" },
  { id:"spec_def",      name:"完美防禦",   icon:"🛡️", desc:"觸發特殊防禦" },
  { id:"evolve_max",    name:"進化達人",   icon:"💫", desc:"達到最終進化" },
  { id:"move_max",      name:"招式精通",   icon:"🌟", desc:"任一招式達 Lv.6" },
  { id:"all_moves_max", name:"全招精通",   icon:"🔱", desc:"四招全部 Lv.6" },
  { id:"fire_clear",    name:"火焰大師",   icon:"🔥", desc:"使用火系通關" },
  { id:"water_clear",   name:"水流大師",   icon:"💧", desc:"使用水系通關" },
  { id:"grass_clear",   name:"森林大師",   icon:"🌿", desc:"使用草系通關" },
  { id:"electric_clear",name:"雷電大師",  icon:"⚡", desc:"使用雷系通關" },
  { id:"lion_clear",    name:"光輝大師",  icon:"✨", desc:"使用光系通關" },
  { id:"boss_kill",     name:"暗黑終結者", icon:"👑", desc:"擊敗暗黑龍王" },
  { id:"low_hp",        name:"不死鳥",     icon:"🦅", desc:"HP ≤ 5 時擊敗敵人" },
  { id:"no_damage",     name:"完美戰役",   icon:"✨", desc:"滿血通關" },
  { id:"enc_all",       name:"收集家",     icon:"📖", desc:"圖鑑遭遇全 14 種怪獸" },
  { id:"enc_defeat",    name:"圖鑑獵人",   icon:"💀", desc:"圖鑑擊敗全 14 種怪獸" },
];

export const ACH_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
