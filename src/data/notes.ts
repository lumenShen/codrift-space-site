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
  units: 74,
  chapters: 31,
  chars: 580742,
  pages: 1248,
  examples: 216,
  graphs: 113,
};
