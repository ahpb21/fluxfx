export const dandelion = {
  title: '蒲公英散开',
  english: 'Dandelion drift',
  duration: 1.8, // 秒
  loop: false,

  build(random, { wind = 24, color = 0xffefbf } = {}) {
    // 每次播放时生成一次。每粒种子有自己的速度和摇摆相位。
    const seeds = Array.from({ length: 16 }, () => ({
      vx: (random() - 0.5) * 55,
      lift: 18 + random() * 28,
      phase: random() * Math.PI * 2
    }));

    return (surface, time) => {
      const u = time / 1.8;
      const spread = 1 - Math.exp(-3 * u);       // 起初散得快，随后慢下来
      const alpha = Math.min(1, (1 - u) * 4);    // 最后四分之一淡出

      for (const seed of seeds) {
        const sway = Math.sin(seed.phase + 5 * u) - Math.sin(seed.phase);
        const x = seed.vx * spread + wind * u * u + sway * 2;
        const y = -seed.lift * spread + 7 * u * u;

        surface.line(x, y, x + 1, y + 3, 0xb98256, alpha); // 种子
        surface.line(x, y, x - 2, y - 2, color, alpha);    // 左侧绒毛
        surface.line(x, y, x + 2, y - 2, color, alpha);    // 右侧绒毛
      }
    };
  }
};