# Emboss Lab · AI 辅助设计接入方案

> 本仓库现阶段仍是零后端的 GitHub Pages 应用。**没有接入 ChatGPT 登录或真实 AI 请求**，也不在浏览器存储模型 API Key。本文件记录面向后续迭代的接口与权限边界。

## 当前图层能力

- 六种元素：文字、矩形、圆形、线条、星形、箭头。
- 每个图层可调节 x / y 百分比、尺寸、颜色、角度、透明度、边框与浮雕阴影。文字另支持内容、字体及字重。
- 五张海报各自保存图层；支持拖动、排序、复制、删除、当前海报链接分享、工程 JSON 导入/导出以及 PNG 合成。
- 运行时数据接口：window.EmbossComposer.applyLayers(layers, { replace: true })。replace 设置为 true 时替换当前海报全部图层，否则追加，最多 24 层。
- 可调用 window.EmbossComposer.getShareData() 获取当前作品的 JSON 图层数据。

## AI 数据结构

AI 应返回符合白名单的纯数据，**不允许执行 AI 生成的 JavaScript、HTML 或自由 SVG**。例如以下 JSON 可以保存为文件，并通过「打开工程」导入到当前场景：

~~~json
{
  "layers": [
    {
      "type": "text",
      "text": "未来 · 纸张",
      "x": 50,
      "y": 25,
      "size": 74,
      "font": "sans",
      "weight": 700,
      "color": "#f7eee0",
      "angle": 0,
      "opacity": 100,
      "emboss": true
    },
    {
      "type": "circle",
      "x": 50,
      "y": 62,
      "size": 185,
      "color": "#dbbca0",
      "outline": true,
      "stroke": 7,
      "opacity": 80
    }
  ]
}
~~~

- 坐标 x / y：0–100%；尺寸：16–320（画布视图为 1000×1222）。
- 旋转角度：-180° 到 +180°；透明度：0–100；文字最多 160 字符；每张海报最多 24 个图层。
- 完整五场景工程可使用：{"format":"emboss-lab-composition","version":1,"scenes":[[],[],[],[],[]]}。
- 当前客户端使用字段白名单校验，服务端接入时仍需二次校验和审核。

## 路线 A：OpenAI API + 服务端函数（网页推荐）

1. 用户输入设计需求，例如「生成黑金工业感的标题与几何徽章」。
2. 前端向自有 /api/design 服务发送画面编号、既有图层和用户提示词。**绝不发送 API Key**。
3. Vercel Functions、Netlify Functions 等后端在安全环境变量中保存密钥，调用 OpenAI Responses API 的结构化输出，让模型只返回受支持的图层类型及参数。
4. 后端执行 JSON Schema 校验、图层数量限制、文本长度限制、超时、费用配额、速率限制与身份检查。
5. 编辑器先显示候选方案与变更摘要，用户点击「应用」后才调用 applyLayers；应保留应用前快照用于撤销。

GitHub Pages 只能托管静态文件，不能放置用于保护密钥的 API 网关。继续部署在 Pages 也可以，但模型请求必须走独立受控的后端，并正确设置 CORS 与鉴权。

如果需求扩大到「让 AI 生成整个网站的 HTML/CSS/React 页面」，应使用单独的隔离执行和 GitHub PR 审查工作流，而不是让模型任意向当前 DOM 注入代码。

官方文档：[Responses API](https://platform.openai.com/docs/guides/text)、[结构化输出](https://platform.openai.com/docs/guides/structured-outputs)、[API 与 ChatGPT 计费区别](https://help.openai.com/en/articles/9039756-managing-billing-for-chatgpt-and-the-api-platform)。

## 路线 B：Sign in with ChatGPT

截至 2026-11，OpenAI 的网站身份登录仍是选定商业合作伙伴的有限试点，需注册 OAuth 客户端并用后端验证令牌；不能简单地在普通 GitHub Pages 中加入按钮就完成接入。

另外，开源/本地应用有独立的 ChatGPT 计划使用路径，符合条件的 Plus/Pro 用户授权后可使用合规的模型调用。**网页登录身份验证不等于模型调用授权**，也不授予获取用户 ChatGPT 对话的权限。需要根据最终部署形态核实资格，不能把本地桌面客户端的方案直接假定适用于公开托管网页。

官方：[Sign in with ChatGPT Quickstart](https://developers.openai.com/siwc/quickstart)、[网站接入](https://developers.openai.com/siwc/website)、[开源应用示例](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt)。

## 开发分期

**一期（当前 PR）**：本地文字及形状编辑、拖动定位、图层管理、工程持久化、JSON 数据适配和导出。

**二期**：参考线与吸附、图层分组和锁定、撤销/重做、自定义 SVG/图片资源和更接近实时画面的导出合成。

**三期**：服务端 AI 网关、模型结构化设计建议、候选对比与确认、审计/限额/隐私控制。

**四期**：满足条件时接入官方 ChatGPT 登录授权、多模态参考图和独立的网站代码生成、PR 审查功能。

保持「确定性的图层渲染器」与「AI 生成器」分离，允许后续替换模型服务而不改动核心编辑器。
