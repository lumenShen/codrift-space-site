/*
 * 液态玻璃的两组「出厂材质」——实验室里并排比较 Codrift 与 Rein 的唯一数据源。
 *
 * 这两组数不是随手编的：
 *   - CODRAFT_GLASS 是 PRODUCT.md「液态玻璃按钮」一条钉死的材质默认值，
 *     src/effects/GlassSurface.vue 的 withDefaults 必须与它逐项一致；
 *   - REIN_GLASS 是 Rein 仓 src/system/glassParams.ts 的 GLASS_DEFAULTS
 *     （2026-09-24 在调节面板上定稿的第二组，按 54~58px 的 UI 尺寸标定）。
 *
 * 实验室把这九个数摊开给访客调：两块玻璃吃同一组参数，差异就只剩「封装」本身；
 * 点「Codrift 默认 / Rein 默认」时又能看到两种产品语境下的材质取向。
 */
export interface GlassMaterial {
  /** 边缘厚度比例（占短边的一半）：越大折射带越宽 */
  borderWidth: number;
  /** 位移贴图中心亮度（%）：50 = 中心不位移，只有边缘在折射 */
  brightness: number;
  /** 位移贴图里内缩亮块的不透明度 */
  opacity: number;
  /** 位移贴图的模糊半径（px）：边缘斜坡的宽度 */
  blur: number;
  /** 位移贴图的光栅分辨率除数：越大越省，观感几乎不变 */
  mapScale: number;
  /** feDisplacementMap 的位移强度（绝对像素） */
  distortionScale: number;
  /** 收尾 feGaussianBlur 的 stdDeviation：边缘柔化 */
  displace: number;
  /** 折射分支的背景饱和度 */
  saturation: number;
  /** 玻璃底色浓度（折射分支半透明底的不透明度） */
  backgroundOpacity: number;
}

/** Codrift 站点版：薄边 + 大位移 + 厚底，压在不可控内容上也能托住白字 */
export const CODRAFT_GLASS: GlassMaterial = {
  borderWidth: 0.02,
  brightness: 50,
  opacity: 0.95,
  blur: 6,
  mapScale: 4,
  distortionScale: -150,
  displace: 2.0,
  saturation: 1.4,
  backgroundOpacity: 0.72,
};

/** Rein 桌面版：窄边被整个扯开，底色压到 0.1，让折射层背后就是页面本身 */
export const REIN_GLASS: GlassMaterial = {
  borderWidth: 0.06,
  brightness: 50,
  opacity: 0.95,
  blur: 11,
  mapScale: 1,
  distortionScale: -180,
  displace: 2.0,
  saturation: 1.4,
  backgroundOpacity: 0.1,
};

export interface GlassPreset {
  id: 'codrift' | 'rein';
  label: string;
  note: string;
  material: GlassMaterial;
}

export const GLASS_PRESETS: GlassPreset[] = [
  {
    id: 'codrift',
    label: 'Codrift 默认',
    note: '0.02 薄边 · -150 位移 · 0.72 厚底',
    material: CODRAFT_GLASS,
  },
  {
    id: 'rein',
    label: 'Rein 默认',
    note: '0.06 厚边 · -180 位移 · 0.10 透心',
    material: REIN_GLASS,
  },
];
