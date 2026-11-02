# 中英术语表

所有页面共用 `docs/scripts/i18n.zh.js` 一份字典：以页面上的英文原文为 key 查表替换，切回英文时恢复原文。样板页为 `docs/index.html` 与 `docs/rev_comp.html`。

## 缩写（不翻译，保持原样）

DNA、RNA、ORF、EMBL、GenBank、FASTA、IUPAC、PCR、CpG、GRAVY、SMS3，以及序列格式名、氨基酸单/三字母代码。

## 术语统一译法

| English | 中文 | 说明 |
| --- | --- | --- |
| sequence | 序列 | |
| reverse complement | 反向互补 | 动词含义写作“取反向互补” |
| complement | 互补 | |
| reverse | 反向 | |
| reverse translate / reverse translation | 反向翻译 | |
| translate / translation | 翻译 | |
| codon | 密码子 | |
| reading frame | 阅读框 | ORF 写作“ORF”，不译 |
| restriction digest / restriction site | 限制性酶切 / 限制性酶切位点 | |
| primer | 引物 | |
| alignment | 比对 | pairwise align → 两两比对 |
| identity / similarity | 一致性 / 相似性 | |
| feature extractor | 特征提取 | |
| trans extractor | 翻译提取 | 从 EMBL/GenBank 记录提取翻译结果 |
| range / window extractor | 区域提取 / 窗口提取 | |
| molecular weight | 分子量 | |
| isoelectric point | 等电点 | |
| mutation / mutate | 突变 | |
| shuffle | 洗牌 | 随机重排序列 |
| sample | 抽样 | |
| filtering | 过滤 | |
| fuzzy search | 模糊搜索 | |
| browser compatibility | 浏览器兼容性 | |
| mirror this site | 镜像本站 | |
| off-line | 离线 | |
| template | 模板 | 作 PCR / 酶切输入的序列 |
| annealing position | 退火位置 | primer annealing position → 引物退火位置 |
| melting temperature | 熔解温度 | |
| GC content | GC 含量 | |
| base / residue | 碱基 / 残基 | 核酸用碱基，蛋白质用残基 |
| open reading frame | 开放阅读框 | ORF 保持原样 |
| start codon / stop codon | 起始密码子 / 终止密码子 | |
| codon usage table | 密码子使用表 | |
| consensus sequence | 共有序列 | |
| degenerate (site) | 简并（位点） | |
| hydropathy / GRAVY | 疏水性 / 平均疏水性 (GRAVY) | GRAVY 缩写保持原样 |
| epitope / fusion protein | 表位 / 融合蛋白 | 标签名（FLAG、His6…）保持英文 |
| gap opening / extension penalty | 空位开启 / 空位延伸罚分 | |
| scoring matrix | 打分矩阵 | PAM、BLOSUM、EDNAFULL 等矩阵名保持英文 |
| genetic code | 遗传密码 | |
| guide sequence | 引导序列 | 抽样程序的输入序列 |
| fragment | 片段 | |
| global alignment | 全局比对 | |
| subsequence | 子序列 | |

## 其余页面接入步骤

1. 在正文列 `<td class="program">` 内加一行 `<div class="i18n-switch"></div>`。
2. 在 `</body>` 前加 `scripts/i18n.zh.js`（带 `charset="utf-8"`）与 `scripts/i18n.js` 两个 `<script>`，顺序不可颠倒。
3. 把该页要译的英文原文（按标签切分后的文本片段，含前导 `-`、标点同理）作为 key 补进 `scripts/i18n.zh.js`；`<option>` 和按钮取可见文字（`value` 属性不译）。
4. 打开页面点 `中文` 核对，再点 `EN` 确认与原文逐字一致。

字典按英文原文精确匹配，因此同一段文字出现在多页时只写一条；拆分在链接或 `<b>` 两侧的句子，按中文语序分别译两段，先读一遍中文整句再定稿。

`docs/gnu_license.html` 的许可证正文不翻译；`<textarea>` 内的示例序列不翻译；`<p class="pre">`、`<p class="pre_bold">`、`<p class="pre_small">` 等示例块由 `i18n.js` 整体跳过；正文中作为字面量出现的短符号（如搜索模式里的通配符 `.`）加 `class="i18n-literal"` 标记，避免被当作标点译掉。
