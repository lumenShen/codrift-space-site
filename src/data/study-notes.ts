// 本文件由 scripts/import-study-books.mjs 生成，请勿手工编辑。
import type { NoteChapter, NoteCollection } from './notes';

const linalgUnits: NoteChapter[] = [
  { id: 'li01', group: '第 1 章', title: '向量：从数组到几何', file: 'units/linalg__chapters__ch01__01-vectors-from-arrays-to-geometry.md.html', meta: '建议 90 分钟' },
  { id: 'li02', group: '第 1 章', title: '线性组合与张成：一组向量能铺出多大的空间', file: 'units/linalg__chapters__ch01__02-linear-combinations-and-span.md.html', meta: '建议 90 分钟' },
  { id: 'li03', group: '第 2 章', title: '矩阵乘法：一层的 forward', file: 'units/linalg__chapters__ch02__01-matrix-multiplication.md.html', meta: '建议 90 分钟' },
  { id: 'li04', group: '第 2 章', title: '逆与高斯消元：把 Ax=b 一步步解回去', file: 'units/linalg__chapters__ch02__02-gauss-elimination.md.html', meta: '建议 90 分钟' },
  { id: 'li05', group: '第 2 章', title: '行列式与体积：一个数字怎么判断可逆', file: 'units/linalg__chapters__ch02__03-determinant-and-volume.md.html', meta: '建议 90 分钟' },
  { id: 'li06', group: '第 3 章', title: '特征值与特征向量：哪个方向只被拉伸不被旋转', file: 'units/linalg__chapters__ch03__01-power-iteration.md.html', meta: '建议 90 分钟' },
  { id: 'li07', group: '第 3 章', title: '对称矩阵与谱分解：旋转、拉伸、转回来', file: 'units/linalg__chapters__ch03__02-spectral-decomposition.md.html', meta: '建议 90 分钟' },
  { id: 'li08', group: '第 3 章', title: 'SVD：任意矩阵的谱', file: 'units/linalg__chapters__ch03__03-svd.md.html', meta: '建议 90 分钟' },
  { id: 'li09', group: '第 4 章', title: '正定与二次型：为什么二次函数有唯一最低点', file: 'units/linalg__chapters__ch04__01-positive-definite.md.html', meta: '建议 90 分钟' },
  { id: 'li10', group: '第 4 章', title: '矩阵微分：反向传播里的转置从哪来', file: 'units/linalg__chapters__ch04__02-matrix-derivatives.md.html', meta: '建议 90 分钟' },
];

const multicUnits: NoteChapter[] = [
  { id: 'mu01', group: '第 1 章', title: '多元函数与偏导数：固定一个变量看变化', file: 'units/multic__chapters__ch01__01-partial-derivatives.md.html', meta: '建议 90 分钟' },
  { id: 'mu02', group: '第 1 章', title: '梯度与方向导数：为什么梯度指向最陡上升', file: 'units/multic__chapters__ch01__02-gradient-and-directional.md.html', meta: '建议 90 分钟' },
  { id: 'mu03', group: '第 2 章', title: 'Jacobian：向量值函数的导数长什么形状', file: 'units/multic__chapters__ch02__01-jacobian.md.html', meta: '建议 90 分钟' },
  { id: 'mu04', group: '第 2 章', title: 'Hessian 与二阶信息：曲率怎么告诉我们离最低点有多近', file: 'units/multic__chapters__ch02__02-hessian.md.html', meta: '建议 90 分钟' },
  { id: 'mu05', group: '第 2 章', title: '链式法则与反向传播', file: 'units/multic__chapters__ch02__03-chain-rule.md.html', meta: '建议 90 分钟' },
  { id: 'mu06', group: '第 3 章', title: '多元梯度下降', file: 'units/multic__chapters__ch03__01-gradient-descent.md.html', meta: '建议 90 分钟' },
  { id: 'mu07', group: '第 3 章', title: '拉格朗日乘子与约束优化', file: 'units/multic__chapters__ch03__02-lagrange.md.html', meta: '建议 90 分钟' },
  { id: 'mu08', group: '第 3 章', title: '矩阵微分：trace 与 Frobenius 内积', file: 'units/multic__chapters__ch03__03-matrix-derivatives.md.html', meta: '建议 90 分钟' },
];

const proboptUnits: NoteChapter[] = [
  { id: 'pr01', group: '第 1 章', title: '随机变量、分布与期望：采样为什么能算出「长期平均」', file: 'units/probopt__chapters__ch01__01-random-variables-and-expectation.md.html', meta: '建议 90 分钟' },
  { id: 'pr02', group: '第 1 章', title: '方差、协方差与相关性：两个量一起变化时怎么看', file: 'units/probopt__chapters__ch01__02-variance-covariance.md.html', meta: '建议 90 分钟' },
  { id: 'pr03', group: '第 1 章', title: '大数定律与中心极限定理：采样均值为什么靠谱、误差长什么样', file: 'units/probopt__chapters__ch01__03-lln-and-clt.md.html', meta: '建议 90 分钟' },
  { id: 'pr04', group: '第 2 章', title: '最大似然估计：训练本质上是哪一种求极值', file: 'units/probopt__chapters__ch02__01-maximum-likelihood.md.html', meta: '建议 90 分钟' },
  { id: 'pr05', group: '第 2 章', title: '熵、KL 散度与交叉熵', file: 'units/probopt__chapters__ch02__02-entropy-and-kl.md.html', meta: '建议 90 分钟' },
  { id: 'pr06', group: '第 3 章', title: '凸性与凸函数', file: 'units/probopt__chapters__ch03__01-convexity.md.html', meta: '建议 90 分钟' },
  { id: 'pr07', group: '第 3 章', title: '梯度下降的收敛性', file: 'units/probopt__chapters__ch03__02-gradient-descent-convergence.md.html', meta: '建议 90 分钟' },
  { id: 'pr08', group: '第 3 章', title: '动量与自适应方法：Adam 到底在平均什么', file: 'units/probopt__chapters__ch03__03-momentum-and-adam.md.html', meta: '建议 90 分钟' },
  { id: 'pr09', group: '第 4 章', title: '拉格朗日对偶与 KKT：对偶变量为什么是影子价格', file: 'units/probopt__chapters__ch04__01-duality-and-kkt.md.html', meta: '建议 90 分钟' },
  { id: 'pr10', group: '第 4 章', title: '采样：逆变换与拒绝采样', file: 'units/probopt__chapters__ch04__02-sampling-methods.md.html', meta: '建议 90 分钟' },
];

const pybridgeUnits: NoteChapter[] = [
  { id: 'py01', group: '第 1 章', title: '从 C 到 Python：类型与执行方式', file: 'units/pybridge__chapters__ch01__01-from-c-to-python.md.html', meta: '建议 90 分钟' },
  { id: 'py02', group: '第 1 章', title: 'NumPy：数组即矩阵', file: 'units/pybridge__chapters__ch01__02-numpy-arrays.md.html', meta: '建议 90 分钟' },
  { id: 'py03', group: '第 1 章', title: 'Python 工程与可复现实验', file: 'units/pybridge__chapters__ch01__03-python-project-and-seeds.md.html', meta: '建议 90 分钟' },
  { id: 'py04', group: '第 2 章', title: 'Tensor 与 autograd：梯度从手写变成自动', file: 'units/pybridge__chapters__ch02__01-tensor-and-autograd.md.html', meta: '建议 90 分钟' },
  { id: 'py05', group: '第 2 章', title: '用 PyTorch 重写两层网络：一行 backward 取代一页手推', file: 'units/pybridge__chapters__ch02__02-twolayer-in-pytorch.md.html', meta: '建议 90 分钟' },
  { id: 'py06', group: '第 2 章', title: '训练循环与固定种子复现：把 autograd 接上数据流', file: 'units/pybridge__chapters__ch02__03-training-loop-and-seeds.md.html', meta: '建议 90 分钟' },
  { id: 'py07', group: '第 3 章', title: 'nn.Module、优化器与调度：框架收走了哪些样板代码', file: 'units/pybridge__chapters__ch03__01-module-optimizer.md.html', meta: '建议 90 分钟' },
  { id: 'py08', group: '第 3 章', title: '从矩阵到注意力：softmax(QKᵀ/√d)V 用框架怎么写', file: 'units/pybridge__chapters__ch03__02-attention-in-pytorch.md.html', meta: '建议 90 分钟' },
];

const mldlUnits: NoteChapter[] = [
  { id: 'ml01', group: '第 1 章', title: '监督学习与线性回归', file: 'units/mldl__chapters__ch01__01-supervised-and-linear-regression.md.html', meta: '建议 90 分钟' },
  { id: 'ml02', group: '第 1 章', title: '逻辑回归与分类损失', file: 'units/mldl__chapters__ch01__02-logistic-regression.md.html', meta: '建议 90 分钟' },
  { id: 'ml03', group: '第 1 章', title: '过拟合、正则化与偏差-方差', file: 'units/mldl__chapters__ch01__03-overfitting-and-bias-variance.md.html', meta: '建议 90 分钟' },
  { id: 'ml04', group: '第 2 章', title: '感知机与多层网络：一个神经元能算什么，堆起来能算什么', file: 'units/mldl__chapters__ch02__01-perceptron-and-mlp.md.html', meta: '建议 90 分钟' },
  { id: 'ml05', group: '第 2 章', title: '反向传播的矩阵形式：前向往右，梯度往左', file: 'units/mldl__chapters__ch02__02-backprop-matrix-form.md.html', meta: '建议 90 分钟' },
  { id: 'ml06', group: '第 2 章', title: '初始化、激活与归一化：深层网络为什么难训', file: 'units/mldl__chapters__ch02__03-initialization-and-normalization.md.html', meta: '建议 90 分钟' },
  { id: 'ml07', group: '第 3 章', title: '卷积网络：局部性与参数共享为什么有效', file: 'units/mldl__chapters__ch03__01-convolutional-networks.md.html', meta: '建议 90 分钟' },
  { id: 'ml08', group: '第 3 章', title: 'RNN、LSTM 与梯度消失：序列模型怎么记住前文', file: 'units/mldl__chapters__ch03__02-rnn-lstm-and-vanishing-gradient.md.html', meta: '建议 90 分钟' },
  { id: 'ml09', group: '第 4 章', title: '正则化工程：三种手段各自防什么', file: 'units/mldl__chapters__ch04__01-regularization-engineering.md.html', meta: '建议 90 分钟' },
  { id: 'ml10', group: '第 4 章', title: '完整训练实验与可复现检查', file: 'units/mldl__chapters__ch04__02-full-experiment.md.html', meta: '建议 90 分钟' },
];

const llmUnits: NoteChapter[] = [
  { id: 'll01', group: '第 1 章', title: '手写 self-attention：从 QKᵀ 到多头对照', file: 'units/llm__chapters__ch01__01-self-attention-from-scratch.md.html', meta: '建议 90 分钟' },
  { id: 'll02', group: '第 1 章', title: '位置与因果掩码：注意力看不见顺序，怎么补上', file: 'units/llm__chapters__ch01__02-position-and-mask.md.html', meta: '建议 90 分钟' },
  { id: 'll03', group: '第 1 章', title: '完整 Transformer block：LN、残差与 FFN 各自解决什么', file: 'units/llm__chapters__ch01__03-transformer-block.md.html', meta: '建议 90 分钟' },
  { id: 'll04', group: '第 2 章', title: '分词与语言建模目标：模型到底在预测什么', file: 'units/llm__chapters__ch02__01-tokenization-and-lm-objective.md.html', meta: '建议 90 分钟' },
  { id: 'll05', group: '第 2 章', title: '预训练循环与规模直觉：损失曲线、数据打包与计算预算', file: 'units/llm__chapters__ch02__02-pretraining-loop.md.html', meta: '建议 90 分钟' },
  { id: 'll06', group: '第 2 章', title: 'KV cache 与推理加速：为什么生成时不能每步重算全部历史', file: 'units/llm__chapters__ch02__03-kv-cache.md.html', meta: '建议 90 分钟' },
  { id: 'll07', group: '第 3 章', title: 'SFT：把基座变成助手——loss mask 为什么只算回答', file: 'units/llm__chapters__ch03__01-sft-and-loss-mask.md.html', meta: '建议 90 分钟' },
  { id: 'll08', group: '第 3 章', title: '偏好优化：奖励模型与 DPO——不强化学习也能对齐吗', file: 'units/llm__chapters__ch03__02-reward-and-dpo.md.html', meta: '建议 90 分钟' },
  { id: 'll09', group: '第 4 章', title: '解码策略：贪心、温度、top-k 与核采样怎么改写同一个分布', file: 'units/llm__chapters__ch04__01-decoding-strategies.md.html', meta: '建议 90 分钟' },
  { id: 'll10', group: '第 4 章', title: '评测、幻觉与安全：怎么判断模型在胡说', file: 'units/llm__chapters__ch04__02-evaluation-and-safety.md.html', meta: '建议 90 分钟' },
];

const dlmathUnits: NoteChapter[] = [
  { id: 'dl01', group: '第 1 章', title: '两层网络：前向、梯度与训练', file: 'units/dlmath__chapters__ch01__01-tiny-network-and-its-gradient.md.html', meta: '建议 90 分钟' },
];

export const studyNotesCollections: NoteCollection[] = [
  {
    id: 'linalg',
    kind: '数学基础',
    title: '线性代数 · 为深度学习裁剪',
    shortTitle: '线性代数',
    subject: '向量 / 矩阵 / 分解 / 矩阵微分',
    tagline: '把矩阵看成一层计算，把分解看成换一组坐标。',
    description: '4 章 10 个单元、8.1 万字：从向量与线性组合起步，走过高斯消元、行列式、特征值、谱分解、SVD、正定与矩阵微分。每个概念都配真编译真跑的 C 例子，黄金值由数值闸门对账，梯度与阴性对照用 gradient 模式验证。',
    status: '完整版',
    keywords: ['线性变换', '特征值', 'SVD', '正定', '矩阵微分'],
    metrics: [
    { value: '4', label: '章' },
    { value: '10', label: '单元' },
    { value: '8.1', label: '万汉字' },
    ],
    meta: '10 个可独立阅读的单元 · 81,074 汉字 · 10 份清单真编译真运行 · 4–5 幅图元/单元',
    chapters: linalgUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/linalg.html', note: '站内连续阅读' },
    ],
  },
  {
    id: 'multic',
    kind: '数学基础',
    title: '多元微积分与矩阵微分',
    shortTitle: '多元微积分',
    subject: '偏导 / 梯度 / Jacobian / Hessian / 链式法则',
    tagline: '导数的形状决定反向传播里每一个转置。',
    description: '3 章 8 个单元、6.4 万字：偏导与梯度、Jacobian 的形状、Hessian 与曲率、链式法则与反向传播、梯度下降、拉格朗日乘子、矩阵微分。解析梯度与中心差分逐项对拍，阴性对照保证检查器真的有判别力。',
    status: '完整版',
    keywords: ['梯度', 'Jacobian', 'Hessian', '链式法则', '矩阵微分'],
    metrics: [
    { value: '3', label: '章' },
    { value: '8', label: '单元' },
    { value: '6.4', label: '万汉字' },
    ],
    meta: '8 个可独立阅读的单元 · 64,364 汉字 · 8 份清单真编译真运行 · gradient / numerical / train 三模式',
    chapters: multicUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/multic.html', note: '站内连续阅读' },
    ],
  },
  {
    id: 'probopt',
    kind: '数学基础',
    title: '概率、信息论与最优化',
    shortTitle: '概率与最优化',
    subject: '采样 / 似然 / 熵 / 凸性 / 收敛',
    tagline: '用采样看期望，用似然看训练，用熵看损失。',
    description: '4 章 10 个单元、8.1 万字：随机变量与期望、协方差、大数定律与 CLT、最大似然、熵与 KL、凸性、梯度下降收敛、动量与 Adam、拉格朗日对偶与采样。固定种子的采样实验与 12 步收敛轨迹都由闸门对账。',
    status: '完整版',
    keywords: ['大数定律', '最大似然', 'KL 散度', '凸性', 'Adam', '拒绝采样'],
    metrics: [
    { value: '4', label: '章' },
    { value: '10', label: '单元' },
    { value: '8.1', label: '万汉字' },
    ],
    meta: '10 个可独立阅读的单元 · 81,010 汉字 · 10 份清单真编译真运行 · numerical + train',
    chapters: proboptUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/probopt.html', note: '站内连续阅读' },
    ],
  },
  {
    id: 'pybridge',
    kind: '工程桥接',
    title: 'Python 与 PyTorch · 从 C 到 autograd',
    shortTitle: 'PyTorch 桥接',
    subject: 'Python / NumPy / PyTorch 2.12',
    tagline: '把手写的数值实验翻译成框架写法，判定标准不变。',
    description: '3 章 8 个单元、6.4 万字：从 C 到 Python、NumPy 向量化、可复现实验、Tensor 与 autograd、两层网络重写、训练循环、nn.Module 与优化器、注意力。流水线新增 lang=python 运行器，六种 Python 自检用例守住判定。',
    status: '完整版',
    keywords: ['NumPy', 'autograd', 'nn.Module', 'Adam', '注意力'],
    metrics: [
    { value: '3', label: '章' },
    { value: '8', label: '单元' },
    { value: '6.4', label: '万汉字' },
    ],
    meta: '8 个可独立阅读的单元 · 64,492 汉字 · 8 份 Python 清单真运行 · 工具链支持 lang=python',
    chapters: pybridgeUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/pybridge.html', note: '站内连续阅读' },
    ],
  },
  {
    id: 'mldl',
    kind: '深度学习',
    title: '机器学习与深度学习核心',
    shortTitle: '机器学习核心',
    subject: '拟合 / 分类 / 泛化 / 神经网络 / 架构',
    tagline: '从「会算梯度」到「会训练模型并判断它学没学会」。',
    description: '4 章 10 个单元、8.3 万字：线性回归、逻辑回归、过拟合与偏差方差、感知机与 MLP、反向传播矩阵形式、初始化与归一化、卷积网络、RNN/LSTM、正则化工程、完整可复现实验。手写梯度与 autograd 逐项相等。',
    status: '完整版',
    keywords: ['线性回归', '交叉熵', '偏差方差', '反向传播', 'CNN', 'LSTM', 'Dropout'],
    metrics: [
    { value: '4', label: '章' },
    { value: '10', label: '单元' },
    { value: '8.3', label: '万汉字' },
    ],
    meta: '10 个可独立阅读的单元 · 82,896 汉字 · 10 份 Python 清单真运行 · numerical + train',
    chapters: mldlUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/mldl.html', note: '站内连续阅读' },
    ],
  },
  {
    id: 'llm',
    kind: '大模型',
    title: 'Transformer 与 LLM 系统',
    shortTitle: 'Transformer 与 LLM',
    subject: '注意力 / 预训练 / 对齐 / 推理 / 评测',
    tagline: '把前面九册的能力汇到一条 LLM 链路上。',
    description: '4 章 10 个单元、8.1 万字：手写 self-attention、位置与因果掩码、Transformer block、分词与语言建模、预训练循环、KV cache、SFT 与 loss mask、奖励模型与 DPO、解码策略、评测与安全。手写与框架结果逐位对齐。',
    status: '完整版',
    keywords: ['self-attention', '因果掩码', 'KV cache', 'SFT', 'DPO', '解码', '幻觉'],
    metrics: [
    { value: '4', label: '章' },
    { value: '10', label: '单元' },
    { value: '8.1', label: '万汉字' },
    ],
    meta: '10 个可独立阅读的单元 · 81,036 汉字 · 10 份 Python 清单真运行 · numerical + train',
    chapters: llmUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/llm.html', note: '站内连续阅读' },
    ],
  },
  {
    id: 'dlmath',
    kind: '数学基础',
    title: '深度学习数学基础 · 试点',
    shortTitle: 'DL 数学试点',
    subject: '两层网络 / 梯度检查 / 种子复现',
    tagline: '一个 13 参数网络，把数值三模式一次性钉死。',
    description: '1 章 1 个单元：2→3→1 网络的前向、解析梯度与中心差分对拍、阴性对照、十步训练轨迹与固定种子复现。它是后面所有数值实验的模板。',
    status: '试点',
    keywords: ['梯度检查', '阴性对照', '种子复现'],
    metrics: [
    { value: '1', label: '章' },
    { value: '1', label: '单元' },
    { value: '0.4', label: '万汉字' },
    ],
    meta: '1 个可独立阅读的单元 · 4,022 汉字 · gradient + numerical + train 三模式的首个模板',
    chapters: dlmathUnits,
    downloads: [
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书阅读版', file: 'books/dlmath.html', note: '站内连续阅读' },
    ],
  },
];
