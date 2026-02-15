/**
 * Starter move sets are centralized here to keep balance/data changes isolated
 * from starter presentation definitions.
 */
export const SKILL_SETS = {
  fire: [
    { name: "火花彈", icon: "🔥", type: "fire", desc: "簡單乘法", basePower: 12, growth: 6, range: [2, 5], ops: ["×"], color: "#ef4444", bg: "#fef2f2" },
    { name: "烈焰衝", icon: "🔥", type: "fire", desc: "九九乘法", basePower: 20, growth: 5, range: [2, 9], ops: ["×"], color: "#f97316", bg: "#fff7ed" },
    { name: "爆炎轟", icon: "🔥", type: "fire", desc: "大數乘法", basePower: 30, growth: 3, range: [4, 12], ops: ["×"], color: "#dc2626", bg: "#fef2f2" },
    { name: "暗火隕爆", icon: "💥", type: "dark", type2: "fire", desc: "暗火·乘除混合", basePower: 40, growth: 3, range: [3, 12], ops: ["×", "÷"], color: "#a855f7", bg: "#faf5ff", risky: true },
  ],
  water: [
    { name: "水泡攻擊", icon: "💧", type: "water", desc: "簡單除法", basePower: 12, growth: 6, range: [2, 5], ops: ["÷"], color: "#3b82f6", bg: "#eff6ff" },
    { name: "水流波", icon: "🌊", type: "water", desc: "進階除法", basePower: 20, growth: 5, range: [2, 9], ops: ["÷"], color: "#2563eb", bg: "#eff6ff" },
    { name: "海嘯衝擊", icon: "🌊", type: "water", desc: "大數除法", basePower: 30, growth: 3, range: [4, 12], ops: ["÷"], color: "#1d4ed8", bg: "#dbeafe" },
    { name: "暗潮渦葬", icon: "💥", type: "dark", type2: "water", desc: "暗水·乘除混合", basePower: 37, growth: 3, range: [3, 12], ops: ["×", "÷"], color: "#a855f7", bg: "#faf5ff", risky: true },
  ],
  grass: [
    { name: "葉刃切", icon: "🌿", type: "grass", desc: "簡單加法", basePower: 12, growth: 6, range: [2, 10], ops: ["+"], color: "#22c55e", bg: "#f0fdf4" },
    { name: "藤鞭打", icon: "🌿", type: "grass", desc: "基本減法", basePower: 20, growth: 5, range: [5, 30], ops: ["-"], color: "#16a34a", bg: "#f0fdf4" },
    { name: "森林風暴", icon: "🌿", type: "grass", desc: "大數加減", basePower: 30, growth: 3, range: [20, 99], ops: ["+", "-"], color: "#15803d", bg: "#dcfce7" },
    { name: "暗棘森崩", icon: "💥", type: "dark", type2: "grass", desc: "暗草·乘除混合", basePower: 40, growth: 3, range: [3, 12], ops: ["×", "÷"], color: "#a855f7", bg: "#faf5ff", risky: true },
  ],
  electric: [
    { name: "電光彈", icon: "⚡", type: "electric", desc: "加減混合", basePower: 12, growth: 6, range: [2, 15], ops: ["mixed2"], color: "#eab308", bg: "#fefce8" },
    { name: "雷電擊", icon: "⚡", type: "electric", desc: "乘加混合", basePower: 20, growth: 5, range: [2, 9], ops: ["mixed3"], color: "#ca8a04", bg: "#fef9c3" },
    { name: "萬雷轟", icon: "⚡", type: "electric", desc: "四則運算", basePower: 30, growth: 3, range: [2, 9], ops: ["mixed4"], color: "#a16207", bg: "#fef08a" },
    { name: "暗雷獄鏈", icon: "💥", type: "dark", type2: "electric", desc: "暗雷·四則混合", basePower: 40, growth: 3, range: [2, 12], ops: ["mixed4"], color: "#a855f7", bg: "#faf5ff", risky: true },
  ],
  lion: [
    { name: "獵爪撲", icon: "✨", type: "light", desc: "加減求未知", basePower: 12, growth: 6, range: [2, 20], ops: ["unknown1"], color: "#f59e0b", bg: "#fffbeb" },
    { name: "獅吼破", icon: "✨", type: "light", desc: "乘除求未知", basePower: 20, growth: 5, range: [2, 9], ops: ["unknown2"], color: "#d97706", bg: "#fef3c7" },
    { name: "烈焰獵擊", icon: "✨", type: "light", desc: "大數求未知", basePower: 30, growth: 3, range: [4, 50], ops: ["unknown3"], color: "#b45309", bg: "#fde68a" },
    { name: "日蝕獅吼", icon: "💥", type: "dark", type2: "light", desc: "暗光·混合求未知", basePower: 40, growth: 3, range: [2, 12], ops: ["unknown4"], color: "#a855f7", bg: "#faf5ff", risky: true },
  ],
};
