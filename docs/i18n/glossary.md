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
| residue | 残基 | 蛋白质/核酸单体单位；不要写“残基基团” |
| base | 碱基 | |
| strand | 链 | direct / reverse strand → 正向链 / 反向链 |
| open reading frame | 开放阅读框 | ORF 本身保留 |
| start codon / stop codon | 起始密码子 / 终止密码子 | |
| synonymous codon | 同义密码子 | |
| genetic code | 遗传密码 | 页面标题 Genetic codes → 遗传密码表 |
| codon usage table | 密码子使用表 | |
| consensus sequence | 共有序列 | |
| degenerate / degeneracy | 简并 / 简并度 | |
| amino acid | 氨基酸 | |
| hydropathy / GRAVY | 疏水性 / 总平均疏水性 (GRAVY) | |
| epitope / fusion protein | 表位 / 融合蛋白 | |
| restriction endonuclease | 限制性内切酶 | |
| feature table | 特征表 | |
| intron | 内含子 | |
| site-directed mutagenesis | 定点突变 | |
| melting temperature | 解链温度 | |
| scoring matrix | 打分矩阵 | |
| score / penalty | 分值 / 罚分 | |
| hit | 命中 | 搜索结果条目 |
| mismatch / gap | 错配 / 空位 | |
| guide sequence | 引导序列 | Sample 类程序的来源序列 |
| numbering | 编号 | |
| group size | 分组大小 | |
| window | 窗口 | 滑动窗口 |

## 其余页面接入步骤

1. 在正文列 `<td class="program">` 内加一行 `<div class="i18n-switch"></div>`。
2. 在 `</body>` 前加 `scripts/i18n.zh.js`（带 `charset="utf-8"`）与 `scripts/i18n.js` 两个 `<script>`，顺序不可颠倒。
3. 把该页要译的英文原文（按标签切分后的文本片段，含前导 `-`、标点同理）作为 key 补进 `scripts/i18n.zh.js`。
4. 打开页面点 `中文` 核对，再点 `EN` 确认与原文逐字一致。

`docs/gnu_license.html` 的许可证正文不翻译；`<textarea>` 内的示例序列不翻译。

等宽数据块（`<pre>`、`p.pre_small` 中的遗传密码表、IUPAC 查找表、酶切位点列表）保留英文原文：插入中文会破坏列对齐，且这些内容属于数据而非界面文案。
