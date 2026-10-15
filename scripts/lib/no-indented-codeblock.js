'use strict';
/*!
 * 缩进不再当成代码块（写作台与网站共用同一份逻辑）
 *
 * Markdown 原语法里，行首缩进 4 个空格 = 代码块。但写中文随笔时，
 * 习惯性用 4 个空格起段非常常见，结果正文会被渲染成一整块代码框。
 *
 * 这里覆盖 marked 处理代码块的分词器：
 *   - 由「行首缩进」产生的代码块  → 还原成普通段落文字（保留原有换行）
 *   - 用 ``` 围栏明确写的代码块    → 完全不受影响
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

    const text = m[0]
      .replace(/^(?: {4}|\t)/gm, '')   // 去掉行首缩进
      .replace(/\n+$/, '');            // 去掉尾部空行

    if (!text) return false;

    // 作为普通文字返回：marked 会按段落渲染，换行原样保留
    return { type: 'text', raw: m[0], text: escape(text) };
  };
  return tokenizer;
}

module.exports = applyNoIndentedCodeBlock;
module.exports.applyNoIndentedCodeBlock = applyNoIndentedCodeBlock;
