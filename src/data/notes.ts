import { studyNotesCollections } from './study-notes';

export interface NoteChapter {
  id: string;
  title: string;
  summary?: string;
  group?: string;
  file: string;
  meta?: string;
}

export interface NoteDownload {
  tag: string;
  label: string;
  file: string;
  note: string;
}

export interface NoteMetric {
  value: string;
  label: string;
}

export interface NoteCollection {
  id: string;
  kind: string;
  title: string;
  shortTitle: string;
  subject: string;
  tagline: string;
  description: string;
  status?: string;
  keywords: string[];
  metrics: NoteMetric[];
  meta: string;
  chapters: NoteChapter[];
  downloads: NoteDownload[];
}

const highMathChapters: NoteChapter[] = [
  {
    id: 'ch01',
    title: '函数与极限',
    summary: '从映射与函数出发，走到 ε-δ 定义、极限运算法则与闭区间上的连续性。',
    file: 'ch01.html',
    meta: '4 单元 · 34 节 · 50 例题',
  },
  {
    id: 'ch02',
    title: '导数与微分',
    summary: '导数定义、求导法则，以及隐函数、参数方程与微分的形式不变性。',
    file: 'ch02.html',
    meta: '2 单元 · 12 节 · 31 例题',
  },
  {
    id: 'ch03',
    title: '微分中值定理与导数的应用',
    summary: '中值定理、洛必达法则与泰勒公式，落到单调性、极值、凹凸与曲率。',
    file: 'ch03.html',
    meta: '3 单元 · 25 节 · 29 例题',
  },
  {
    id: 'ch04',
    title: '不定积分',
    summary: '原函数、换元积分与分部积分，再到有理式积分与积分表的使用。',
    file: 'ch04.html',
    meta: '2 单元 · 16 节 · 26 例题',
  },
  {
    id: 'ch05',
    title: '定积分',
    summary: '可积条件、微积分基本定理、定积分的换元与分部，以及反常积分与 Γ 函数。',
    file: 'ch05.html',
    meta: '2 单元 · 19 节 · 26 例题',
  },
  {
    id: 'ch06',
    title: '定积分的应用',
    summary: '元素法：平面面积、旋转体体积、弧长，以及变力做功、水压力与引力。',
    file: 'ch06.html',
    meta: '1 单元 · 12 节 · 14 例题',
  },
  {
    id: 'ch07',
    title: '微分方程',
    summary: '一阶方程、可降阶方程、线性高阶方程，以及欧拉方程与微分方程组。',
    file: 'ch07.html',
    meta: '3 单元 · 26 节 · 40 例题',
  },
];

const reviewChapters: NoteChapter[] = [
  {
    id: 'ch01',
    title: '函数与极限',
    summary: '映射、数列极限、ε-δ 语言、无穷小比较与闭区间上的连续性。',
    file: 'ch01.html',
    meta: '4 单元 · 33 节',
  },
  {
    id: 'ch02',
    title: '导数与微分',
    summary: '导数定义、求导法则、高阶导数，以及隐函数与参数方程求导。',
    file: 'ch02.html',
    meta: '2 单元 · 12 节',
  },
  {
    id: 'ch03',
    title: '微分中值定理与导数的应用',
    summary: '中值定理、洛必达、泰勒公式，以及单调性、极值、曲率与近似解。',
    file: 'ch03.html',
    meta: '3 单元 · 25 节',
  },
  {
    id: 'ch04',
    title: '不定积分',
    summary: '原函数、换元与分部积分、有理式积分与积分表。',
    file: 'ch04.html',
    meta: '2 单元 · 16 节',
  },
  {
    id: 'ch05',
    title: '定积分',
    summary: '可积条件、微积分基本定理、换元与分部，以及反常积分。',
    file: 'ch05.html',
    meta: '2 单元 · 19 节',
  },
  {
    id: 'ch06',
    title: '定积分的应用',
    summary: '元素法、平面面积、旋转体体积、弧长与物理应用。',
    file: 'ch06.html',
    meta: '1 单元 · 12 节',
  },
  {
    id: 'ch07',
    title: '微分方程',
    summary: '一阶方程、可降阶方程、线性高阶方程与微分方程组。',
    file: 'ch07.html',
    meta: '3 单元 · 26 节',
  },
];

const cUnits: NoteChapter[] = [
  {
    id: 'c01',
    group: '第 1 章 起步：从源文件到能跑的程序',
    title: '从源文件到可执行文件：你的第一个 C 程序',
    file: 'units/c__chapters__ch01__01-from-source-to-program.md.html',
  },
  {
    id: 'c02',
    group: '第 1 章 起步：从源文件到能跑的程序',
    title: '编译器的脾气：诊断、警告与构建命令',
    file: 'units/c__chapters__ch01__02-diagnostics-and-warnings.md.html',
  },
  {
    id: 'c03',
    group: '第 2 章 数据与表达式：类型、取值与运算',
    title: '类型与取值范围：整型、字符与浮点',
    file: 'units/c__chapters__ch02__01-types-and-ranges.md.html',
  },
  {
    id: 'c04',
    group: '第 2 章 数据与表达式：类型、取值与运算',
    title: '整数的边界：提升、溢出、位运算与枚举',
    file: 'units/c__chapters__ch02__02-integer-promotion-and-overflow.md.html',
  },
  {
    id: 'c05',
    group: '第 2 章 数据与表达式：类型、取值与运算',
    title: '表达式与求值：优先级、转换与顺序',
    file: 'units/c__chapters__ch02__03-expressions-and-evaluation.md.html',
  },
  {
    id: 'c06',
    group: '第 3 章 控制流与函数',
    title: '分支与循环：把流程写对',
    file: 'units/c__chapters__ch03__01-branches-and-loops.md.html',
  },
  {
    id: 'c07',
    group: '第 3 章 控制流与函数',
    title: '函数：声明、定义、调用栈与 static 局部变量',
    file: 'units/c__chapters__ch03__02-functions-and-call-stack.md.html',
  },
  {
    id: 'c08',
    group: '第 4 章 数组、字符串与指针',
    title: '数组与字符串：连续的一块内存',
    file: 'units/c__chapters__ch04__01-arrays-and-strings.md.html',
  },
  {
    id: 'c09',
    group: '第 4 章 数组、字符串与指针',
    title: '指针与内存：地址、类型与生命周期',
    file: 'units/c__chapters__ch04__02-pointers-and-memory.md.html',
  },
  {
    id: 'c10',
    group: '第 4 章 数组、字符串与指针',
    title: '指针的用法与约定：接口、多级指针与函数指针',
    file: 'units/c__chapters__ch04__03-pointer-idioms.md.html',
  },
  {
    id: 'c11',
    group: '第 5 章 结构体与动态内存',
    title: '结构体：把数据打包，以及看不见的 padding',
    file: 'units/c__chapters__ch05__01-structs-and-alignment.md.html',
  },
  {
    id: 'c12',
    group: '第 5 章 结构体与动态内存',
    title: '动态内存：malloc 与生命周期',
    file: 'units/c__chapters__ch05__02-dynamic-memory.md.html',
  },
  {
    id: 'c13',
    group: '第 5 章 结构体与动态内存',
    title: '自引用结构与链表：用指针串起数据',
    file: 'units/c__chapters__ch05__03-linked-structures.md.html',
  },
  {
    id: 'c14',
    group: '第 6 章 标准库与文件',
    title: '文件与 I/O：把结果留下来',
    file: 'units/c__chapters__ch06__01-files-and-io.md.html',
  },
  {
    id: 'c15',
    group: '第 6 章 标准库与文件',
    title: '标准库工具箱：字符串、解析、排序与数学',
    file: 'units/c__chapters__ch06__02-stdlib-toolbox.md.html',
  },
  {
    id: 'c16',
    group: '第 7 章 工程与工具：预处理、多文件与调试',
    title: '预处理与宏：符号在编译之前怎么变形',
    file: 'units/c__chapters__ch07__01-preprocessing-and-macros.md.html',
  },
  {
    id: 'c17',
    group: '第 7 章 工程与工具：预处理、多文件与调试',
    title: '多文件工程：头文件、编译单元与链接性',
    file: 'units/c__chapters__ch07__02-multiple-files-and-linkage.md.html',
  },
  {
    id: 'c18',
    group: '第 7 章 工程与工具：预处理、多文件与调试',
    title: '调试与排错：gdb、退出码与排错套路',
    file: 'units/c__chapters__ch07__03-debugging.md.html',
  },
  {
    id: 'c19',
    group: '第 8 章 未定义行为、优化与收尾',
    title: '未定义行为与优化边界：编译器有多大自由度',
    file: 'units/c__chapters__ch08__01-undefined-behavior-and-optimization.md.html',
  },
  {
    id: 'c20',
    group: '第 8 章 未定义行为、优化与收尾',
    title: '收尾：从会写 C 到能维护一个 C 程序',
    file: 'units/c__chapters__ch08__02-maintaining-c.md.html',
  },
];

const cppUnits: NoteChapter[] = [
  {
    id: 'cpp01',
    group: '第 1 章 起步：从 C 到 C++',
    title: '工具链与第一个 C++ 程序：g++、std::print、编译链接',
    file: 'units/cpp__chapters__ch01__01-toolchain-and-first-program.md.html',
  },
  {
    id: 'cpp02',
    group: '第 1 章 起步：从 C 到 C++',
    title: '引用、const 与命名空间：C++ 的地基',
    file: 'units/cpp__chapters__ch01__02-references-const-namespaces.md.html',
  },
  {
    id: 'cpp03',
    group: '第 2 章 对象生命周期',
    title: '类与 RAII：构造、析构、拷贝构造',
    file: 'units/cpp__chapters__ch02__01-classes-and-raii.md.html',
  },
  {
    id: 'cpp04',
    group: '第 2 章 对象生命周期',
    title: '拷贝与移动：值类别、std::move 与 Rule of Five',
    file: 'units/cpp__chapters__ch02__02-copy-and-move.md.html',
  },
  {
    id: 'cpp05',
    group: '第 2 章 对象生命周期',
    title: '智能指针与所有权：unique_ptr、shared_ptr、weak_ptr',
    file: 'units/cpp__chapters__ch02__03-smart-pointers-and-ownership.md.html',
  },
  {
    id: 'cpp06',
    group: '第 3 章 继承与多态',
    title: '继承与虚函数：动态多态、对象切片',
    file: 'units/cpp__chapters__ch03__01-inheritance-and-virtual.md.html',
  },
  {
    id: 'cpp07',
    group: '第 3 章 继承与多态',
    title: '多态的设计代价：虚析构、接口类、组合优于继承',
    file: 'units/cpp__chapters__ch03__02-polymorphism-cost.md.html',
  },
  {
    id: 'cpp08',
    group: '第 4 章 模板与泛型',
    title: '模板入门：函数模板、类模板、实例化',
    file: 'units/cpp__chapters__ch04__01-template-basics.md.html',
  },
  {
    id: 'cpp09',
    group: '第 4 章 模板与泛型',
    title: 'concepts 与约束：从 SFINAE 到 requires',
    file: 'units/cpp__chapters__ch04__02-concepts.md.html',
  },
  {
    id: 'cpp10',
    group: '第 4 章 模板与泛型',
    title: '可变参数模板与完美转发：forward、折叠表达式',
    file: 'units/cpp__chapters__ch04__03-variadic-and-forwarding.md.html',
  },
  {
    id: 'cpp11',
    group: '第 5 章 标准库容器与算法',
    title: '序列容器：vector、string、deque、list 的取舍',
    file: 'units/cpp__chapters__ch05__01-sequence-containers.md.html',
  },
  {
    id: 'cpp12',
    group: '第 5 章 标准库容器与算法',
    title: '关联容器与哈希：map、set、unordered_*',
    file: 'units/cpp__chapters__ch05__02-associative-containers.md.html',
  },
  {
    id: 'cpp13',
    group: '第 5 章 标准库容器与算法',
    title: '迭代器、算法与 ranges：lambda、views、zip / enumerate',
    file: 'units/cpp__chapters__ch05__03-iterators-algorithms-ranges.md.html',
  },
  {
    id: 'cpp14',
    group: '第 6 章 现代语言特性',
    title: 'auto、decltype 与结构化绑定',
    file: 'units/cpp__chapters__ch06__01-auto-decltype-structured-binding.md.html',
  },
  {
    id: 'cpp15',
    group: '第 6 章 现代语言特性',
    title: 'lambda 与函数对象',
    file: 'units/cpp__chapters__ch06__02-lambdas-and-function-objects.md.html',
  },
  {
    id: 'cpp16',
    group: '第 7 章 错误处理与资源',
    title: '异常、noexcept 与异常安全',
    file: 'units/cpp__chapters__ch07__01-exceptions-noexcept.md.html',
  },
  {
    id: 'cpp17',
    group: '第 7 章 错误处理与资源',
    title: 'optional、variant 与 expected',
    file: 'units/cpp__chapters__ch07__02-optional-variant-expected.md.html',
  },
  {
    id: 'cpp18',
    group: '第 8 章 编译期与系统 I/O',
    title: 'constexpr 与 consteval',
    file: 'units/cpp__chapters__ch08__01-constexpr-consteval.md.html',
  },
  {
    id: 'cpp19',
    group: '第 8 章 编译期与系统 I/O',
    title: '文件、格式化与生成器',
    file: 'units/cpp__chapters__ch08__02-files-format-generator.md.html',
  },
  {
    id: 'cpp20',
    group: '第 9 章 工程与收尾',
    title: '多文件工程、ODR 与收尾',
    file: 'units/cpp__chapters__ch09__01-multi-file-odr-and-wrap-up.md.html',
  },
];


const algoUnits: NoteChapter[] = [
  {
    id: 'a01',
    group: '第 1 章 起步：算法在竞赛里的工程形态',
    title: '规模表与复杂度：从「能过」反推算法',
    file: 'units/algo__chapters__ch01__01-scale-and-complexity.md.html',
  },
  {
    id: 'a02',
    title: '对拍工程：让结论被随机数据验证',
    file: 'units/algo__chapters__ch01__02-stress-testing.md.html',
  },
  {
    id: 'a03',
    group: '第 2 章 线性结构：栈、队列、并查集、堆',
    title: '数组模拟栈与单调栈：让每个元素至多进出一次栈',
    file: 'units/algo__chapters__ch02__01-array-stack-mono-stack.md.html',
  },
  {
    id: 'a04',
    title: '单调队列：滑动窗口最大值、环形双端队列与窗口 DP',
    file: 'units/algo__chapters__ch02__02-monotone-queue.md.html',
  },
  {
    id: 'a05',
    title: '并查集：把「连在一起」变成比较两个根',
    file: 'units/algo__chapters__ch02__03-union-find.md.html',
  },
  {
    id: 'a06',
    title: '二叉堆与优先队列：把「谁最优先」变成父子下标的比较',
    file: 'units/algo__chapters__ch02__04-binary-heap.md.html',
  },
  {
    id: 'a07',
    group: '第 3 章 排序与二分',
    title: '排序：比较器、归并逆序对与基数排序',
    file: 'units/algo__chapters__ch03__01-sorting.md.html',
  },
  {
    id: 'a08',
    title: '二分与三分：四种写法、二分答案与单峰极值',
    file: 'units/algo__chapters__ch03__02-binary-search.md.html',
  },
  {
    id: 'a09',
    group: '第 4 章 前缀、差分与双指针',
    title: '前缀和与差分：把区间问题变成端点问题',
    file: 'units/algo__chapters__ch04__01-prefix-diff.md.html',
  },
  {
    id: 'a10',
    title: '双指针与滑动窗口：右端扩张、左端收缩的不变式',
    file: 'units/algo__chapters__ch04__02-two-pointers.md.html',
  },
  {
    id: 'a11',
    group: '第 5 章 树状结构：树、树状数组、线段树',
    title: '树与 LCA：DFS 序、欧拉序与倍增跳跃',
    file: 'units/algo__chapters__ch05__01-tree-lca.md.html',
  },
  {
    id: 'a12',
    title: '树状数组：lowbit 把前缀拆成不重叠的管段',
    file: 'units/algo__chapters__ch05__02-fenwick.md.html',
  },
  {
    id: 'a13',
    title: '线段树：把区间问题挂到一棵平衡划分树上',
    file: 'units/algo__chapters__ch05__03-segment-tree.md.html',
  },
  {
    id: 'a14',
    group: '第 6 章 图论基础：存图、遍历、最短路、拓扑',
    title: '存图与遍历：把图装进内存，再把它走一遍',
    file: 'units/algo__chapters__ch06__01-graph-traversal.md.html',
  },
  {
    id: 'a15',
    title: '最短路：非负权交给堆，负权交给轮次',
    file: 'units/algo__chapters__ch06__02-shortest-paths.md.html',
  },
  {
    id: 'a16',
    title: '拓扑排序：给依赖关系排出执行顺序',
    file: 'units/algo__chapters__ch06__03-topological-sort.md.html',
  },
  {
    id: 'a17',
    group: '第 7 章 进阶图论：生成树、连通性、匹配与流',
    title: '最小生成树：贪心挑边，两个证明护住它',
    file: 'units/algo__chapters__ch07__01-mst.md.html',
  },
  {
    id: 'a18',
    title: '强连通、割点与桥：dfn/low 一张表看穿图的骨架',
    file: 'units/algo__chapters__ch07__02-scc-and-bridges.md.html',
  },
  {
    id: 'a19',
    title: '匹配与网络流：从增广路到分层图',
    file: 'units/algo__chapters__ch07__03-matching-and-flow.md.html',
  },
  {
    id: 'a20',
    group: '第 8 章 动态规划：线性、背包、区间、树形',
    title: '线性 DP 与背包：状态、决策与循环方向',
    file: 'units/algo__chapters__ch08__01-linear-dp-knapsack.md.html',
  },
  {
    id: 'a21',
    title: '区间 DP 与树形 DP：枚举断点，先儿子后自己',
    file: 'units/algo__chapters__ch08__02-interval-tree-dp.md.html',
  },
  {
    id: 'a22',
    group: '第 9 章 动态规划进阶：状压、数位、优化',
    title: '状压 DP 与数位 DP：把状态塞进一个整数里',
    file: 'units/algo__chapters__ch09__01-bitmask-digit-dp.md.html',
  },
  {
    id: 'a23',
    title: 'DP 优化：把转移里的重复算一次算清',
    file: 'units/algo__chapters__ch09__02-dp-optimization.md.html',
  },
  {
    id: 'a24',
    group: '第 10 章 字符串：哈希、KMP、Trie、AC 自动机',
    title: '字符串哈希与 KMP：把比对变成整数与跳转',
    file: 'units/algo__chapters__ch10__01-hash-kmp.md.html',
  },
  {
    id: 'a25',
    title: 'Trie 与 AC 自动机：把字符变成边，把失配变成跳转',
    file: 'units/algo__chapters__ch10__02-trie-ac-automaton.md.html',
  },
  {
    id: 'a26',
    group: '第 11 章 数学与计算几何',
    title: '数论与矩阵快速幂：把整除关系变成可计算的式子',
    file: 'units/algo__chapters__ch11__01-number-theory.md.html',
  },
  {
    id: 'a27',
    title: '计算几何：叉积定方向，扫描线降维',
    file: 'units/algo__chapters__ch11__02-geometry.md.html',
  },
  {
    id: 'a28',
    group: '第 12 章 赛时工程与收尾',
    title: '赛时工程与收尾：把会的算法稳定地写出来',
    file: 'units/algo__chapters__ch12__01-contest-engineering.md.html',
  },
];


const rustUnits: NoteChapter[] = [
  {
    group: '第一部分 · Rust 语法',
    id: 'r01',
    title: 'Rust 工具链与第一个程序',
    file: 'units/rust__chapters__ch01__toolchain-and-first-program.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r02',
    title: '类型系统与所有权',
    file: 'units/rust__chapters__ch01__types-and-ownership.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r03',
    title: '借用与引用',
    file: 'units/rust__chapters__ch01__borrowing-and-references.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r04',
    title: '生命周期',
    file: 'units/rust__chapters__ch01__lifetimes.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r05',
    title: '枚举与错误处理',
    file: 'units/rust__chapters__ch01__enums-and-errors.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r06',
    title: 'trait 与泛型',
    file: 'units/rust__chapters__ch01__structs-traits-generics.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r07',
    title: '闭包与迭代器',
    file: 'units/rust__chapters__ch01__closures-and-iterators.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r08',
    title: '高级类型与机制',
    file: 'units/rust__chapters__ch01__advanced-types.md.html',
    meta: '建议 90 分钟',
  },
  {
    group: '第二部分 · Rust 工程',
    id: 'r09',
    title: 'Cargo 工程化：workspace、feature 矩阵与依赖解析',
    file: 'units/rust__chapters__ch02__cargo-workspace-and-features.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r10',
    title: '错误处理实战：从领域错误到错误链',
    file: 'units/rust__chapters__ch02__error-handling-in-practice.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r11',
    title: '测试与文档：分层验证、属性测试与可执行文档',
    file: 'units/rust__chapters__ch02__testing-and-documentation.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r12',
    title: '并发与异步：从所有权到状态机',
    file: 'units/rust__chapters__ch02__concurrency-and-async.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r13',
    title: 'unsafe 与 FFI 边界',
    file: 'units/rust__chapters__ch02__unsafe-and-ffi.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r14',
    title: '发布与 CI 工程',
    file: 'units/rust__chapters__ch02__shipping-and-ci.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r15',
    title: '生态实战：一个真正能跑的 CLI',
    file: 'units/rust__chapters__ch02__ecosystem-in-practice.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r16',
    title: '异步运行时与性能',
    file: 'units/rust__chapters__ch02__async-runtime-and-performance.md.html',
    meta: '建议 90 分钟',
  },
  {
    group: '第三部分 · 算法 Rust 版',
    id: 'r17',
    title: '复杂度与 Rust 算法工程约定',
    file: 'units/rust__chapters__ch03__complexity-and-rust-idioms.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r18',
    title: '栈、队列与单调结构',
    file: 'units/rust__chapters__ch03__stacks-queues-monotone.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r19',
    title: '并查集与堆',
    file: 'units/rust__chapters__ch03__union-find-and-heap.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r20',
    title: '排序与二分',
    file: 'units/rust__chapters__ch03__sorting-and-binary-search.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r21',
    title: '前缀和与差分、双指针',
    file: 'units/rust__chapters__ch03__prefix-diff-two-pointers.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r22',
    title: '树与 LCA：从迭代遍历到倍增与欧拉序',
    file: 'units/rust__chapters__ch03__trees-and-lca.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r23',
    title: '图遍历与最短路：从队列不变式到负环判定',
    file: 'units/rust__chapters__ch03__graph-traversal-shortest-paths.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r24',
    title: '高级图论：低链接值、缩点与最小生成树',
    file: 'units/rust__chapters__ch03__graph-advanced.md.html',
    meta: '建议 100 分钟',
  },
  {
    id: 'r25',
    title: '网络流与匹配：增广路、最小割与二分图建模',
    file: 'units/rust__chapters__ch03__flow-and-matching.md.html',
    meta: '建议 100 分钟',
  },
  {
    id: 'r26',
    title: '动态规划基础：状态定义、线性、背包与区间',
    file: 'units/rust__chapters__ch03__dp-basics.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r27',
    title: '动态规划进阶',
    file: 'units/rust__chapters__ch03__dp-advanced.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r28',
    title: '字符串基础',
    file: 'units/rust__chapters__ch03__strings-basics.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r29',
    title: '字符串进阶',
    file: 'units/rust__chapters__ch03__strings-advanced.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r30',
    title: '贪心与构造',
    file: 'units/rust__chapters__ch03__greedy-and-constructive.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r31',
    title: '高级数据结构：线段树、二维 BIT 与主席树',
    file: 'units/rust__chapters__ch03__advanced-data-structures.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r32',
    title: '数论：快速幂、扩展欧几里得、逆元、CRT 与素数判定',
    file: 'units/rust__chapters__ch03__number-theory.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r33',
    title: '计算几何：叉积、凸包与扫描线',
    file: 'units/rust__chapters__ch03__geometry.md.html',
    meta: '建议 90 分钟',
  },
  {
    id: 'r34',
    title: '随机化与对拍工程：从可复现随机源到失败用例缩小',
    file: 'units/rust__chapters__ch03__randomized-and-stress.md.html',
    meta: '建议 90 分钟',
  },
];

export const notesCollections: NoteCollection[] = [
  {
    id: 'gaoshu',
    kind: '正课版',
    title: '高等数学 · 正课',
    shortTitle: '高数正课',
    subject: '同济第八版 · 上册',
    tagline: '把每一步讲透：定义、证明、例题，再加一段大白话。',
    description:
      '以同济《高等数学》第八版上册为底本，逐节重写定义、定理与推导，每节补一段「大白话」；216 道例题、113 幅函数图像、253 条机械验算，HTML 与 464 页 A4 PDF 出自同一条流水线。',
    keywords: ['ε-δ', '中值定理', '泰勒公式', '定积分', '微分方程'],
    metrics: [
      { value: '7', label: '章' },
      { value: '17', label: '单元' },
      { value: '216', label: '例题' },
    ],
    meta: '144 节 · 464 页 PDF · 205,756 字',
    chapters: highMathChapters,
    downloads: [
      { tag: 'PDF', label: '整册 PDF', file: 'notes-vol1.pdf', note: '464 页 · A4' },
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '双击即读' },
    ],
  },
  {
    id: 'gaoshu-review',
    kind: '复习版',
    title: '高等数学 · 复习',
    shortTitle: '高数复习',
    subject: '同济第八版 · 上册',
    tagline: '只留概念、公式与做题路径，按章速查。',
    description:
      '正课版的速查 companion：143 节压成概念、公式、重要定理与关键推导，不设例题与自测；102 页 A4，适合考前翻查、建立框架，再回正课版补细节。',
    keywords: ['概念速查', '公式表', '定理清单', '做题路径'],
    metrics: [
      { value: '7', label: '章' },
      { value: '17', label: '单元' },
      { value: '102', label: '页 PDF' },
    ],
    meta: '143 节 · 52,458 字 · 与正课版逐章对应',
    chapters: reviewChapters,
    downloads: [
      { tag: 'PDF', label: '整册 PDF', file: 'notes-vol1.pdf', note: '102 页 · A4' },
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '双击即读' },
    ],
  },
  {
    id: 'c-engineering',
    kind: '工程笔记',
    title: 'C 语言 · 工程视角',
    shortTitle: 'C 语言工程',
    subject: '从源文件到可维护工程',
    tagline: '从编译器、内存与链接的视角，重学一遍 C。',
    description:
      '以「能维护一个 C 程序」为目标：8 章 20 个单元覆盖类型、指针、内存、结构体、文件、预处理、多文件链接与未定义行为；242 份清单全部过真编译、真运行闸门，正文输出由真实 stdout/stderr 回写。512 页 A4 PDF 与单文件 HTML 与站内单元出自同一套源文件。',
    status: '完整版',
    keywords: ['编译器视角', '指针与内存', '链接', '未定义行为'],
    metrics: [
      { value: '8', label: '章' },
      { value: '20', label: '单元' },
      { value: '23.0', label: '万汉字' },
    ],
    meta: '20 个可独立阅读的单元 · 230,023 字 · 512 页 PDF',
    chapters: cUnits,
    downloads: [
      { tag: 'PDF', label: '整册 PDF', file: 'c.pdf', note: '512 页 · A4' },
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书 HTML', file: 'books/c.html', note: '站内阅读版' },
    ],
  },

  {
    id: 'cpp-engineering',
    kind: '工程笔记',
    title: 'C++ 语言 · 工程视角',
    shortTitle: 'C++ 语言工程',
    subject: 'C++23 · 核心与常用新特性',
    tagline: '从 C 出发，把现代 C++ 写进真实工程。',
    description:
      '以「从 C 到 C++」为路线：9 章 20 个单元覆盖引用与 const、RAII、拷贝与移动、继承与多态、模板与 concepts、容器与 ranges、异常与 expected、编译期计算与系统 I/O，最后落到多文件工程。125 份清单全部过真编译、真运行闸门，正文输出由真实 stdout/stderr 回写。170 页 A4 PDF 与单文件 HTML 与站内单元出自同一套源文件。',
    status: '完整版',
    keywords: ['RAII', '移动语义', '模板与 concepts', 'ranges', 'C++23'],
    metrics: [
      { value: '9', label: '章' },
      { value: '20', label: '单元' },
      { value: '9.2', label: '万汉字' },
    ],
    meta: '20 个可独立阅读的单元 · 92,389 字 · 170 页 PDF',
    chapters: cppUnits,
    downloads: [
      { tag: 'PDF', label: '整册 PDF', file: 'cpp.pdf', note: '170 页 · A4' },
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书 HTML', file: 'books/cpp.html', note: '站内阅读版' },
    ],
  },
  {
    id: 'algo-engineering',
    kind: '工程笔记',
    title: '算法 · 从能过题到能拿牌',
    shortTitle: '算法竞赛',
    subject: '竞赛算法 · C 手写原理 / C++ STL 应用',
    tagline: '原理用 C 手写，应用用 STL，结论用随机数据对拍验证。',
    description:
      '12 章 28 个单元，从规模表与对拍工程起步，覆盖线性结构、排序二分、前缀差分、树与图论、各类 DP、字符串、数论与计算几何，最后落到赛时工程。每个算法都有复杂度表、正确性论证与至少 200 组随机数据对拍；186 份清单全部真编译、真运行、0 失败，正文输出由真实 stdout/stderr 回写。522 页 A4 PDF、单文件 HTML 与站内单元出自同一套源文件。',
    status: '完整版',
    keywords: ['复杂度', '对拍', '单调栈', '图论', '动态规划', 'AC 自动机'],
    metrics: [
      { value: '12', label: '章' },
      { value: '28', label: '单元' },
      { value: '32.5', label: '万汉字' },
    ],
    meta: '28 个可独立阅读的单元 · 324,851 字 · 522 页 PDF · 186 份清单全绿',
    chapters: algoUnits,
    downloads: [
      { tag: 'PDF', label: '整册 PDF', file: 'algo.pdf', note: '522 页 · A4' },
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书 HTML', file: 'books/algo.html', note: '站内阅读版' },
    ],
  },
  {
    id: 'rust-engineering',
    kind: '工程笔记',
    title: 'Rust · 从语法到工程与算法',
    shortTitle: 'Rust 工程',
    subject: 'Rust 2021 edition · 机制 / 工程 / 算法',
    tagline: '把机制讲透，把工程落地，把算法用 Rust 重写一遍。',
    description:
      '三编 34 个单元、约 18.4 万字：语法编深挖借用检查、NLL、方差、单态化、vtable、trait 解析与 Pin；工程编用真实 cargo 工程讲 workspace、thiserror/anyhow、proptest/criterion、tokio、unsafe/FFI、clap/serde/tracing 与发布流水线；算法编 18 单元覆盖字符串、图论、网络流、DP、数论与几何，每份结论都跑过随机对拍。175 份代码清单全部真编译、真运行，正文输出由真实 stdout/stderr 回写。',
    status: '完整版',
    keywords: ['所有权与借用', '生命周期', 'trait 与泛型', 'Cargo 工程', 'tokio', '随机对拍', '算法 Rust 版'],
    metrics: [
      { value: '3', label: '编' },
      { value: '34', label: '单元' },
      { value: '18.4', label: '万汉字' },
    ],
    meta: '34 个可独立阅读的单元 · 183,897 汉字 · 175 份清单真编译真运行 · 67 幅图元 · 351 页 PDF',
    chapters: rustUnits,
    downloads: [
      { tag: 'PDF', label: '整册 PDF', file: 'rust.pdf', note: '351 页 · A4' },
      { tag: 'HTML', label: '单文件离线版', file: 'book-inline.html', note: '样式内联 · 双击即读' },
      { tag: 'HTML', label: '合书 HTML', file: 'books/rust.html', note: '站内阅读版' },
    ],
  },
  ...studyNotesCollections,
];

export const notesBase = `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}notes/`;

export function noteFileUrl(collection: NoteCollection, file: string): string {
  return `${notesBase}${collection.id}/${file}`;
}

export function noteDownloadName(file: string): string {
  return file.split('/').pop() ?? file;
}

export const notesTotals = {
  kinds: notesCollections.length,
  units: 136 + studyNotesCollections.reduce((n, c) => n + c.chapters.length, 0),
  chapters: 46,
  chars: 1089490 + 448482,
  pages: 2121,
  examples: 216 + 88,
  graphs: 113 + 111,
};
