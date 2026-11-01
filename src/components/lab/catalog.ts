/*
 * 实验室目录 —— 新增实验的唯一登记处。
 *
 * 页头右侧目录、顶部实验卡都用这份数据渲染；新增一个实验组件时：
 *   1) 在 LAB_ENTRIES 追加一条（no 顺延，id 与页面 section 的 id 一致）；
 *   2) 在 ComponentLabPage.vue 里加同名 section；
 *   3) 在页面脚本的 sourceTabs 里补源码入口与 GitHub 原文件链接。
 */
export type LabCategoryId = 'glass' | 'interaction' | 'motion' | 'reference';

export type LabEntryKind = 'experiment' | 'deep-dive' | 'source';

export interface LabCategory {
  id: LabCategoryId;
  label: string;
  en: string;
}

export interface LabEntry {
  /** 锚点 id，必须与页面 section 的 id 一致 */
  id: string;
  /** 两位编号，目录与分区头共用 */
  no: string;
  category: LabCategoryId;
  kind: LabEntryKind;
  title: string;
  en: string;
  summary: string;
  tags: string[];
}

export const LAB_CATEGORIES: LabCategory[] = [
  { id: 'glass', label: '液态玻璃', en: 'Liquid Glass' },
  { id: 'interaction', label: '交互组件', en: 'Interaction' },
  { id: 'motion', label: '动效组件', en: 'Motion' },
  { id: 'reference', label: '附录', en: 'Reference' },
];

export const LAB_ENTRIES: LabEntry[] = [
  {
    id: 'glass',
    no: '01',
    category: 'glass',
    kind: 'experiment',
    title: '液态玻璃',
    en: 'Liquid Glass',
    summary: 'Codrift 与 Rein 两套 SVG 位移折射，放在同一块场景上并排比较。',
    tags: ['SVG filter', 'backdrop-filter', 'mapScale'],
  },
  {
    id: 'pipeline',
    no: '02',
    category: 'glass',
    kind: 'deep-dive',
    title: '折射管线',
    en: 'Refraction Pipeline',
    summary: '贴图、位移、合成、退化，以及用贴图分辨率除数换移动端性能。',
    tags: ['feImage', 'feDisplacementMap', '降采样'],
  },
  {
    id: 'hero-tag',
    no: '03',
    category: 'interaction',
    kind: 'experiment',
    title: 'Hero Tag',
    en: 'Stack Deck',
    summary: '身份行特色胶囊的可拖拽牌堆：1:1 跟手、甩出换牌、两拍归位。',
    tags: ['Spring', 'Pointer', 'A11y'],
  },
  {
    id: 'gradual-blur',
    no: '04',
    category: 'motion',
    kind: 'experiment',
    title: '渐进模糊',
    en: 'Gradual Blur',
    summary: '多层 backdrop-filter 叠加 mask，让滚动内容在条带边缘逐渐化开。',
    tags: ['backdrop-filter', 'mask', 'N layers'],
  },
  {
    id: 'source',
    no: '05',
    category: 'reference',
    kind: 'source',
    title: '源码',
    en: 'Source',
    summary: '站内正在运行的原文件，复制即用。',
    tags: ['?raw', 'MIT'],
  },
];

export const LAB_EXPERIMENTS = LAB_ENTRIES.filter((entry) => entry.kind === 'experiment');
