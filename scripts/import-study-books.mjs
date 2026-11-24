// import-study-books.mjs — 把 dev-notes 已渲染好的七本新书接入本站 notes 专区。
// 只做两件事：复制成品 HTML 到 public/notes/<id>/；生成 src/data/study-notes.ts 数据。
// 书的内容源文件在 dev-notes/books/，闸门在那里跑；这里不碰内容。

import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dev = path.resolve(root, '../Study/dev-notes');
const publicNotes = path.join(root, 'public/notes');
const generatedData = path.join(root, 'src/data/study-notes.ts');

const books = [
  {
    id: 'linalg', kind: '数学基础', title: '线性代数 · 为深度学习裁剪', shortTitle: '线性代数',
    subject: '向量 / 矩阵 / 分解 / 矩阵微分', tagline: '把矩阵看成一层计算，把分解看成换一组坐标。',
    description: '4 章 10 个单元、8.1 万字：从向量与线性组合起步，走过高斯消元、行列式、特征值、谱分解、SVD、正定与矩阵微分。每个概念都配真编译真跑的 C 例子，黄金值由数值闸门对账，梯度与阴性对照用 gradient 模式验证。',
    status: '完整版', keywords: ['线性变换', '特征值', 'SVD', '正定', '矩阵微分'],
    metrics: [['4', '章'], ['10', '单元'], ['8.1', '万汉字']],
    meta: '10 个可独立阅读的单元 · 81,074 汉字 · 10 份清单真编译真运行 · 4–5 幅图元/单元',
  },
  {
    id: 'multic', kind: '数学基础', title: '多元微积分与矩阵微分', shortTitle: '多元微积分',
    subject: '偏导 / 梯度 / Jacobian / Hessian / 链式法则', tagline: '导数的形状决定反向传播里每一个转置。',
    description: '3 章 8 个单元、6.4 万字：偏导与梯度、Jacobian 的形状、Hessian 与曲率、链式法则与反向传播、梯度下降、拉格朗日乘子、矩阵微分。解析梯度与中心差分逐项对拍，阴性对照保证检查器真的有判别力。',
    status: '完整版', keywords: ['梯度', 'Jacobian', 'Hessian', '链式法则', '矩阵微分'],
    metrics: [['3', '章'], ['8', '单元'], ['6.4', '万汉字']],
    meta: '8 个可独立阅读的单元 · 64,364 汉字 · 8 份清单真编译真运行 · gradient / numerical / train 三模式',
  },
  {
    id: 'probopt', kind: '数学基础', title: '概率、信息论与最优化', shortTitle: '概率与最优化',
    subject: '采样 / 似然 / 熵 / 凸性 / 收敛', tagline: '用采样看期望，用似然看训练，用熵看损失。',
    description: '4 章 10 个单元、8.1 万字：随机变量与期望、协方差、大数定律与 CLT、最大似然、熵与 KL、凸性、梯度下降收敛、动量与 Adam、拉格朗日对偶与采样。固定种子的采样实验与 12 步收敛轨迹都由闸门对账。',
    status: '完整版', keywords: ['大数定律', '最大似然', 'KL 散度', '凸性', 'Adam', '拒绝采样'],
    metrics: [['4', '章'], ['10', '单元'], ['8.1', '万汉字']],
    meta: '10 个可独立阅读的单元 · 81,010 汉字 · 10 份清单真编译真运行 · numerical + train',
  },
  {
    id: 'pybridge', kind: '工程桥接', title: 'Python 与 PyTorch · 从 C 到 autograd', shortTitle: 'PyTorch 桥接',
    subject: 'Python / NumPy / PyTorch 2.12', tagline: '把手写的数值实验翻译成框架写法，判定标准不变。',
    description: '3 章 8 个单元、6.4 万字：从 C 到 Python、NumPy 向量化、可复现实验、Tensor 与 autograd、两层网络重写、训练循环、nn.Module 与优化器、注意力。流水线新增 lang=python 运行器，六种 Python 自检用例守住判定。',
    status: '完整版', keywords: ['NumPy', 'autograd', 'nn.Module', 'Adam', '注意力'],
    metrics: [['3', '章'], ['8', '单元'], ['6.4', '万汉字']],
    meta: '8 个可独立阅读的单元 · 64,492 汉字 · 8 份 Python 清单真运行 · 工具链支持 lang=python',
  },
  {
    id: 'mldl', kind: '深度学习', title: '机器学习与深度学习核心', shortTitle: '机器学习核心',
    subject: '拟合 / 分类 / 泛化 / 神经网络 / 架构', tagline: '从「会算梯度」到「会训练模型并判断它学没学会」。',
    description: '4 章 10 个单元、8.3 万字：线性回归、逻辑回归、过拟合与偏差方差、感知机与 MLP、反向传播矩阵形式、初始化与归一化、卷积网络、RNN/LSTM、正则化工程、完整可复现实验。手写梯度与 autograd 逐项相等。',
    status: '完整版', keywords: ['线性回归', '交叉熵', '偏差方差', '反向传播', 'CNN', 'LSTM', 'Dropout'],
    metrics: [['4', '章'], ['10', '单元'], ['8.3', '万汉字']],
    meta: '10 个可独立阅读的单元 · 82,896 汉字 · 10 份 Python 清单真运行 · numerical + train',
  },
  {
    id: 'llm', kind: '大模型', title: 'Transformer 与 LLM 系统', shortTitle: 'Transformer 与 LLM',
    subject: '注意力 / 预训练 / 对齐 / 推理 / 评测', tagline: '把前面九册的能力汇到一条 LLM 链路上。',
    description: '4 章 10 个单元、8.1 万字：手写 self-attention、位置与因果掩码、Transformer block、分词与语言建模、预训练循环、KV cache、SFT 与 loss mask、奖励模型与 DPO、解码策略、评测与安全。手写与框架结果逐位对齐。',
    status: '完整版', keywords: ['self-attention', '因果掩码', 'KV cache', 'SFT', 'DPO', '解码', '幻觉'],
    metrics: [['4', '章'], ['10', '单元'], ['8.1', '万汉字']],
    meta: '10 个可独立阅读的单元 · 81,036 汉字 · 10 份 Python 清单真运行 · numerical + train',
  },
  {
    id: 'dlmath', kind: '数学基础', title: '深度学习数学基础 · 试点', shortTitle: 'DL 数学试点',
    subject: '两层网络 / 梯度检查 / 种子复现', tagline: '一个 13 参数网络，把数值三模式一次性钉死。',
    description: '1 章 1 个单元：2→3→1 网络的前向、解析梯度与中心差分对拍、阴性对照、十步训练轨迹与固定种子复现。它是后面所有数值实验的模板。',
    status: '试点', keywords: ['梯度检查', '阴性对照', '种子复现'],
    metrics: [['1', '章'], ['1', '单元'], ['0.4', '万汉字']],
    meta: '1 个可独立阅读的单元 · 4,022 汉字 · gradient + numerical + train 三模式的首个模板',
  },
];

function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' '); }
function copy(from, to) { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to); }
function unitsOf(id) {
  return fs.readdirSync(path.join(dev, 'dist/units'))
    .filter((f) => f.startsWith(id + '__') && f.endsWith('.md.html')).sort();
}

let copied = 0;
const parts = ['// 本文件由 scripts/import-study-books.mjs 生成，请勿手工编辑。\n',
  "import type { NoteChapter, NoteCollection } from './notes';\n\n"];
const collections = [];

for (const book of books) {
  const files = unitsOf(book.id);
  if (!files.length) throw new Error(`${book.id}: no unit pages found`);

  const target = path.join(publicNotes, book.id);
  copy(path.join(dev, 'dist/theme.css'), path.join(target, 'theme.css'));
  copy(path.join(dev, `dist/books/${book.id}.html`), path.join(target, `books/${book.id}.html`));
  copy(path.join(dev, `dist/${book.id}-inline.html`), path.join(target, 'book-inline.html'));

  const varName = `${book.id}Units`;
  parts.push(`const ${varName}: NoteChapter[] = [\n`);
  for (const [i, file] of files.entries()) {
    copy(path.join(dev, 'dist/units', file), path.join(target, 'units', file));
    copied += 1;
    const html = fs.readFileSync(path.join(dev, 'dist/units', file), 'utf8');
    const title = (/<title>([^<]*)<\/title>/.exec(html) || [null, file])[1];
    const ch = /__(ch\d+)__/.exec(file);
    const group = ch ? `第 ${Number(ch[1].slice(2))} 章` : '正文';
    const id = `${book.id.slice(0, 2)}${String(i + 1).padStart(2, '0')}`;
    parts.push(`  { id: '${id}', group: '${esc(group)}', title: '${esc(title)}', file: 'units/${file}', meta: '建议 90 分钟' },\n`);
  }
  parts.push('];\n\n');

  const metrics = book.metrics.map(([v, l]) => `    { value: '${v}', label: '${l}' },`).join('\n');
  collections.push(`  {
    id: '${book.id}',
    kind: '${esc(book.kind)}',
    title: '${esc(book.title)}',
    shortTitle: '${esc(book.shortTitle)}',
    subject: '${esc(book.subject)}',
    tagline: '${esc(book.tagline)}',
    description: '${esc(book.description)}',
    status: '${esc(book.status)}',
    keywords: [${book.keywords.map((k) => `'${esc(k)}'`).join(', ')}],
    metrics: [
${metrics}
    ],
    meta: '${esc(book.meta)}',
    chapters: ${varName},
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/${book.id}.html', note: '站内连续阅读' },
    ],
  },`);
}

parts.push('export const studyNotesCollections: NoteCollection[] = [\n', collections.join('\n'), '\n];\n');
fs.writeFileSync(generatedData, parts.join(''));
console.log(`copied ${copied} unit pages across ${books.length} books`);
console.log(`wrote ${path.relative(root, generatedData)}`);
