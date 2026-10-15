/*!
 * 缩进不再当成代码块 —— Hexo 侧入口
 *
 * 真正的逻辑放在 scripts/lib/no-indented-codeblock.js，
 * 这样写作台（QIUblogStudio）可以 require 同一份文件，保证预览与网站完全一致。
 */

const applyNoIndentedCodeBlock = require('./lib/no-indented-codeblock');

hexo.extend.filter.register('marked:tokenizer', function (tokenizer) {
  return applyNoIndentedCodeBlock(tokenizer);
});
