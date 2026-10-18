/*!
 * Markdown 渲染定制 —— Hexo 侧入口
 *
 * 真正的逻辑放在 scripts/lib/no-indented-codeblock.js，
 * 这样写作台（QIUblogStudio）可以 require 同一份文件，保证预览与网站完全一致。
 *
 * 注册两处：
 *   marked:tokenizer → 缩进不再被当成代码块
 *   marked:use       → 渲染完成后统一做「首行缩进 + 单回车换行」
 */

const applyNoIndentedCodeBlock = require('./lib/no-indented-codeblock');

hexo.extend.filter.register('marked:tokenizer', function (tokenizer) {
  return applyNoIndentedCodeBlock(tokenizer);
});

hexo.extend.filter.register('marked:use', function (use) {
  if (typeof use !== 'function') return;
  use({
    hooks: {
      postprocess(html) {
        return applyNoIndentedCodeBlock.formatParagraphs(html);
      }
    }
  });
});
