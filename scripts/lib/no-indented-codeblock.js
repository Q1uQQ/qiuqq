'use strict';
/*!
 * Markdown 渲染的三处定制（写作台与网站共用同一份逻辑）
 *
 * 1. 缩进不再当成代码块
 *    Markdown 原语法里，行首缩进 4 个空格 = 代码块。但写中文随笔时，
 *    习惯性用空格起段非常常见，结果正文会被渲染成一整块深色代码框。
 *    这里覆盖 marked 处理代码块的分词器：
 *      - 由「行首缩进」产生的代码块 → 还原成普通段落文字
 *      - 用 ``` 围栏明确写的代码块   → 完全不受影响
 *
 * 2. 段首缩进要真的看得见
 *    HTML 会把段首的连续空格折叠掉，所以「打了空格却没有缩进」。
 *    这里把段首空格换算成 CSS 的 text-indent（首行缩进）：
 *      - 1 个空格        → 1em
 *      - 2 个及以上的空格 → 2em（两个汉字宽，中文常规首行缩进）
 *    这样不管习惯敲 2 格还是 4 格，读起来都是规整的首行缩进。
 *
 * 3. 敲一次回车就换行
 *    普通段落由 marked 的 breaks 选项处理；而「缩进块被还原成文字」时
 *    段内会残留裸换行，这里统一转成 <br>，保证预览和网站表现一致。
 *
 * 想写代码块请用 ``` 围栏；缩进不再有代码块的含义。
 */

/* HTML 转义：优先用 hexo-util（博客里一定有），否则退回内置实现，
   这样写作台脱离 Hexo 也能单独使用这个模块。 */
function fallbackEscape(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function resolveEscape() {
  try {
    const util = require('hexo-util');
    if (util && typeof util.escapeHTML === 'function') return util.escapeHTML;
  } catch (e) { /* 不在 Hexo 环境里，用内置实现 */ }
  return fallbackEscape;
}

/**
 * 覆盖 marked 的代码分词器。
 * @param {object} tokenizer marked 传入的 tokenizer 对象（会被就地修改）
 * @returns {object} 同一个 tokenizer 对象
 */
function applyNoIndentedCodeBlock(tokenizer) {
  const escape = resolveEscape();
  tokenizer.code = function (src) {
    // 只在「整块都由缩进行组成」时接管；其余情况交回原始分词器
    const m = /^(?: {4}|\t)([^\n]*(?:\n(?: {4}|\t)[^\n]*)*)/.exec(src);
    if (!m) return false;

    const lines = m[0].split('\n');
    // 第一行保留缩进，交给 formatParagraphs 换算成首行缩进；
    // 其余行去掉一级缩进，免得 <br> 之后残留一串空格。
    const first = lines.shift();
    const rest = lines.map(l => l.replace(/^(?: {4}|\t)/, ''));
    const text = [first].concat(rest).join('\n').replace(/\n+$/, '');

    if (!text.trim()) return false;

    // 作为普通文字返回：marked 会按段落渲染，段内换行由 formatParagraphs 转成 <br>
    return { type: 'text', raw: m[0], text: escape(text) };
  };
  return tokenizer;
}

/** 段首空格数 → 首行缩进（em）。2 格及以上统一按 2 个汉字宽处理。 */
function indentEm(spaces) {
  if (spaces <= 0) return 0;
  return spaces >= 2 ? 2 : 1;
}

/**
 * 把渲染出来的 <p> 段落做两件小事：
 *   - 段首空格 → style="text-indent: Nem"（首行缩进）
 *   - 段内裸换行 → <br>（保证「敲一次回车就换行」）
 * 含 <pre>/<code> 的段落原样放过，避免动到真正的代码块。
 */
function formatParagraphs(html) {
  if (!html) return html;
  return String(html).replace(/<p(\s[^>]*)?>([\s\S]*?)<\/p>/g, (all, attrs, inner) => {
    if (/<pre[\s>]|<code[\s>]/i.test(inner)) return all;

    // 数段首的空格（制表符按 4 个空格算）
    let lead = 0;
    const m = /^[ \t]+/.exec(inner);
    if (m) {
      for (const ch of m[0]) lead += (ch === '\t' ? 4 : 1);
    }
    const body = m ? inner.slice(m[0].length) : inner;

    // 段内裸换行 → <br>（\r\n 与 \n 都处理）；
    // <br> 后面的空格没有意义（浏览器本来也会折叠），顺手去掉更干净
    const withBreaks = body
      .replace(/\r\n|\r|\n/g, '<br>')
      .replace(/(<br\s*\/?>)[ \t]+/gi, '$1');

    const em = indentEm(lead);
    // 段落已有 style 就不重复加，免得出错
    const hasStyle = attrs && /style\s*=/i.test(attrs);
    const styleAttr = (em && !hasStyle) ? ` style="text-indent:${em}em"` : '';

    return `<p${attrs || ''}${styleAttr}>${withBreaks}</p>`;
  });
}

module.exports = applyNoIndentedCodeBlock;
module.exports.applyNoIndentedCodeBlock = applyNoIndentedCodeBlock;
module.exports.formatParagraphs = formatParagraphs;
module.exports.indentEm = indentEm;
