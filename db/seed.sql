-- ===========================================================================
-- SoMarkIt — seed data
-- Run: npm run db:seed
-- ===========================================================================

DELETE FROM tools;
DELETE FROM categories;

INSERT INTO categories (slug, name, name_en, name_ja, name_ko, icon, description, description_en, description_ja, description_ko, sort_order, visible) VALUES
('ai-chat',     'AI 对话助手', 'AI Chat',        'AI チャット',          'AI 채팅',
  'chat',
  '通用大模型对话产品，覆盖日常问答、写作、分析与多轮推理。',
  'General-purpose chat assistants for Q&A, writing, analysis and multi-turn reasoning.',
  '日常の質問応答・執筆・分析・多段推論に対応する汎用チャット製品。',
  '일상 질의응답, 글쓰기, 분석, 다중 턴 추론을 지원하는 범용 대화 제품.',
  1, 1),
('ai-agent',    'AI 智能体',   'AI Agents',      'AI エージェント',      'AI 에이전트',
  'bot',
  '能自主拆解任务、调用工具、跨应用执行的智能体产品。',
  'Agents that plan tasks, call tools and act across applications.',
  'タスクを自律的に分解し、ツールを呼び出し、アプリをまたいで実行するエージェント。',
  '작업을 스스로 분해하고 도구를 호출해 앱을 넘나들며 실행하는 에이전트.',
  2, 1),
('ai-coding',   'AI 编程开发', 'AI Coding',      'AI コーディング',      'AI 코딩',
  'code',
  '覆盖代码补全、终端 Agent、AI IDE 与代码审查的编程工具。',
  'Code completion, terminal agents, AI IDEs and code review.',
  'コード補完、ターミナルエージェント、AI IDE、コードレビューをカバー。',
  '코드 완성, 터미널 에이전트, AI IDE, 코드 리뷰를 아우르는 개발 도구.',
  3, 1),
('ai-office',   'AI 办公效率', 'AI Office',      'AI オフィス',          'AI 오피스',
  'office',
  '文档、表格、演示、会议纪要与知识管理类 AI 工具。',
  'Documents, spreadsheets, slides, meeting notes and knowledge management.',
  '文書・表計算・プレゼン・議事録・ナレッジ管理のための AI ツール。',
  '문서, 스프레드시트, 프레젠테이션, 회의록, 지식 관리를 위한 AI 도구.',
  4, 1),
('ai-writing',  'AI 写作翻译', 'AI Writing',     'AI ライティング',      'AI 글쓰기',
  'pen',
  '长文写作、SEO 内容、翻译与润色类工具。',
  'Long-form writing, SEO content, translation and polishing.',
  '長文執筆、SEO コンテンツ、翻訳、推敲のためのツール。',
  '장문 작성, SEO 콘텐츠, 번역, 첨삭을 위한 도구.',
  5, 1),
('ai-image',    'AI 图像工具', 'AI Image',       'AI 画像',              'AI 이미지',
  'image',
  '文生图、图像编辑、抠图与设计素材生成。',
  'Text-to-image, editing, background removal and design asset generation.',
  'テキストから画像生成、編集、背景除去、デザイン素材の生成。',
  '텍스트에서 이미지 생성, 편집, 배경 제거, 디자인 소재 생성.',
  6, 1),
('ai-video',    'AI 视频工具', 'AI Video',       'AI 動画',              'AI 영상',
  'video',
  '文生视频、视频剪辑、数字人与口播生成。',
  'Text-to-video, editing, digital avatars and talking-head generation.',
  'テキストから動画生成、編集、デジタルヒューマン、ナレーション生成。',
  '텍스트에서 영상 생성, 편집, 디지털 휴먼, 낭독 영상 생성.',
  7, 1),
('ai-audio',    'AI 音频音乐', 'AI Audio',       'AI 音声・音楽',        'AI 오디오·음악',
  'audio',
  '语音合成、音乐生成、语音识别与音频处理。',
  'Speech synthesis, music generation, transcription and audio processing.',
  '音声合成、音楽生成、音声認識、オーディオ処理。',
  '음성 합성, 음악 생성, 음성 인식, 오디오 처리.',
  8, 1),
('ai-design',   'AI 设计创意', 'AI Design',      'AI デザイン',          'AI 디자인',
  'design',
  'UI 生成、视觉设计与创意灵感类工具。',
  'UI generation, visual design and creative inspiration.',
  'UI 生成、ビジュアルデザイン、アイデア出しのためのツール。',
  'UI 생성, 비주얼 디자인, 아이디어 발상을 위한 도구.',
  9, 1),
('ai-research', 'AI 搜索研究', 'AI Research',    'AI リサーチ',          'AI 리서치',
  'search',
  'AI 搜索引擎、深度研究与资料整理。',
  'AI search engines, deep research and material organisation.',
  'AI 検索エンジン、リサーチ、資料整理。',
  'AI 검색 엔진, 심층 리서치, 자료 정리.',
  10, 1),
('ai-model',    'AI 大模型',   'AI Models',      'AI 基盤モデル',        'AI 파운데이션 모델',
  'layers',
  '基础模型与开源权重模型系列。',
  'Foundation models and open-weight model series.',
  '基盤モデルとオープンウェイトのモデルシリーズ。',
  '파운데이션 모델 및 오픈 웨이트 모델 시리즈.',
  11, 1),
('ai-platform', 'AI 开发平台', 'AI Platforms',   'AI 開発プラットフォーム', 'AI 개발 플랫폼',
  'wrench',
  '模型 API、推理平台与应用开发框架。',
  'Model APIs, inference platforms and application frameworks.',
  'モデル API、推論プラットフォーム、アプリ開発フレームワーク。',
  '모델 API, 추론 플랫폼, 앱 개발 프레임워크.',
  12, 1),
('ai-media',    'AI 新媒体',   'AI Media',       'AI メディア',          'AI 미디어',
  'rocket',
  '公众号、短视频与内容运营中的 AI 提效工具。',
  'AI tools for newsletters, short video and content operations.',
  'ニュースレター、ショート動画、コンテンツ運用を効率化する AI ツール。',
  '뉴스레터, 숏폼 영상, 콘텐츠 운영을 효율화하는 AI 도구.',
  13, 1);

-- ===========================================================================
-- AI 对话助手
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('chatgpt', 'ChatGPT', 'https://chatgpt.com', 'OpenAI 出品的通用 AI 助手，支持 GPT 系列模型、联网搜索、图像理解、文件分析与自定义 GPTs，是目前覆盖面最广的对话式 AI 产品之一。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,写作,编程,多模态', 'freemium', 1, 0, 1, 'published', 1),
('claude', 'Claude', 'https://claude.ai', 'Anthropic 的 AI 助手，以长文本理解、严谨推理与代码能力见称，支持 Artifacts 实时预览与 Projects 项目空间，适合处理长文档与复杂分析任务。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,长文本,编程,分析', 'freemium', 1, 0, 1, 'published', 2),
('gemini', 'Gemini', 'https://gemini.google.com', 'Google 的多模态大模型助手，原生支持图像、视频、音频与超长上下文，深度集成 Google 搜索、Workspace 与 Android 生态。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,多模态,Google,搜索', 'freemium', 1, 0, 1, 'published', 3),
('deepseek', 'DeepSeek', 'https://chat.deepseek.com', '深度求索推出的开源大模型对话产品，推理与代码能力突出，API 价格极具竞争力，并提供完全开放的模型权重。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,开源,推理,国产', 'free', 1, 0, 1, 'published', 4),
('doubao', '豆包', 'https://www.doubao.com', '字节跳动旗下 AI 助手，中文语境表现自然，支持联网搜索、图像生成、语音通话与智能体创建，移动端体验流畅。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,国产,多模态,智能体', 'free', 1, 0, 1, 'published', 5),
('kimi', 'Kimi', 'https://kimi.moonshot.cn', '月之暗面的 AI 助手，以超长上下文文档分析见长，支持联网搜索、文件解析与代码解读，适合学术与长文资料处理。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,长文本,文档分析,国产', 'free', 1, 0, 1, 'published', 6),
('qwen', '通义千问', 'https://tongyi.aliyun.com', '阿里云的通义千问大模型助手，覆盖对话、写作、编程与多模态理解，与阿里云生态及 Qwen 开源模型系列深度绑定。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,开源,阿里云,国产', 'freemium', 0, 0, 0, 'published', 7),
('yuanbao', '腾讯元宝', 'https://yuanbao.tencent.com', '腾讯推出的 AI 助手，接入混元与 DeepSeek 双模型，可解析公众号文章与微信文件，深度整合腾讯内容生态。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,国产,微信生态', 'free', 0, 0, 0, 'published', 8),
('ernie', '文心一言', 'https://yiyan.baidu.com', '百度文心大模型对话产品，中文知识问答与创意写作成熟，并结合百度搜索能力提供实时信息。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,国产,百度,搜索', 'freemium', 0, 0, 0, 'published', 9),
('copilot', 'Microsoft Copilot', 'https://copilot.microsoft.com', '微软的 AI 助手，融合 Bing 搜索与 Microsoft 365 办公套件，可在 Office 应用内直接完成写作、摘要与数据处理。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,办公,微软,搜索', 'freemium', 0, 0, 0, 'published', 10),
('perplexity', 'Perplexity', 'https://www.perplexity.ai', 'AI 搜索引擎，针对问题实时联网检索并给出带引用来源的结构化回答，适合做快速事实核查与对比调研。', (SELECT id FROM categories WHERE slug='ai-chat'), '搜索,引用,研究,对话', 'freemium', 1, 0, 0, 'published', 11),
('grok', 'Grok', 'https://grok.com', 'xAI 的大模型助手，实时接入 X 平台公开内容，风格直接，支持图像理解与联网查询。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,xAI,实时,社交', 'freemium', 0, 0, 0, 'published', 12),
('lechat', 'Le Chat', 'https://chat.mistral.ai', 'Mistral AI 的对话助手，响应速度快，支持代码、文档与图像处理，欧洲数据合规友好。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,Mistral,欧洲,开源', 'freemium', 0, 0, 0, 'published', 13),
('poe', 'Poe', 'https://poe.com', 'Quora 推出的一站式 AI 平台，聚合 GPT、Claude、Gemini 等主流模型与大量社区 Bot，一个订阅即可横向对比模型输出。', (SELECT id FROM categories WHERE slug='ai-chat'), '聚合,多模型,订阅,Bot', 'freemium', 0, 0, 0, 'published', 14),
('characterai', 'Character.AI', 'https://character.ai', 'AI 角色扮演社区，可创建或选用海量自定义角色进行对话，强调人格设定与长期记忆的沉浸式体验。', (SELECT id FROM categories WHERE slug='ai-chat'), '角色扮演,社区,陪伴,创意', 'freemium', 0, 0, 0, 'published', 15),
('metai', 'Meta AI', 'https://www.meta.ai', 'Meta 的 AI 助手，基于 Llama 系列模型，可在 WhatsApp、Instagram 与 Messenger 内直接调用。', (SELECT id FROM categories WHERE slug='ai-chat'), '对话,Meta,Llama,社交', 'free', 0, 0, 0, 'published', 16);

-- ===========================================================================
-- AI 智能体
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('manus', 'Manus', 'https://manus.im', '通用 AI Agent，能把目标拆解成多步任务并在云端沙箱里自主执行，最终交付文档、网页或分析结果，适合做调研与自动化落地。', (SELECT id FROM categories WHERE slug='ai-agent'), '通用Agent,任务执行,调研', 'paid', 1, 0, 1, 'published', 1),
('genspark', 'Genspark', 'https://www.genspark.ai', '多智能体搜索工作区，针对目标自动规划检索路径并生成结构化 Sparkpage 知识页，适合做行业扫描与竞品简报。', (SELECT id FROM categories WHERE slug='ai-agent'), '多智能体,搜索,知识页', 'freemium', 0, 0, 0, 'published', 2),
('flowith', 'Flowith', 'https://flowith.io', '画布式 Agent 工作台，把复杂任务拆成节点并行执行，支持多模型同场调用与研究报告、幻灯片一键出稿。', (SELECT id FROM categories WHERE slug='ai-agent'), '画布,并行,工作流,多模型', 'freemium', 0, 0, 0, 'published', 3),
('lindy', 'Lindy', 'https://www.lindy.ai', '业务自动化 Agent 平台，可连接邮件、日历、CRM 等大量 SaaS，用自然语言配置触发器与自动化流程。', (SELECT id FROM categories WHERE slug='ai-agent'), '自动化,集成,工作流,业务', 'freemium', 0, 0, 0, 'published', 4),
('coze', '扣子 Coze', 'https://www.coze.cn', '字节跳动的 AI Bot 构建平台，零代码编排插件与工作流，可一键发布到微信、飞书、抖音等渠道。', (SELECT id FROM categories WHERE slug='ai-agent'), 'Bot构建,零代码,工作流,国产', 'freemium', 1, 0, 0, 'published', 5),
('dify', 'Dify', 'https://dify.ai', '开源 LLM 应用开发平台，可视化编排 RAG 与 Agent 工作流，支持私有化部署，是企业落地 AI 应用的常见底座。', (SELECT id FROM categories WHERE slug='ai-agent'), '开源,LLM应用,RAG,私有化', 'opensource', 1, 0, 0, 'published', 6),
('n8n', 'n8n', 'https://n8n.io', '开源工作流自动化平台，内置大量素材连接器与 AI Agent 节点，既能无代码搭建也能写代码扩展，可自托管。', (SELECT id FROM categories WHERE slug='ai-agent'), '自动化,开源,自托管,集成', 'opensource', 1, 0, 0, 'published', 7),
('browseruse', 'Browser Use', 'https://browser-use.com', '开源浏览器 Agent 框架，让大模型具备网页导航、表单填写与信息抽取能力，可嵌入自己的业务系统。', (SELECT id FROM categories WHERE slug='ai-agent'), '浏览器,开源,自动化,框架', 'opensource', 0, 0, 0, 'published', 8),
('skyvern', 'Skyvern', 'https://www.skyvern.com', '基于视觉与 LLM 的浏览器自动化 Agent，无需写选择器即可完成表单填写、数据抓取与后台操作。', (SELECT id FROM categories WHERE slug='ai-agent'), '浏览器,自动化,爬取,表单', 'freemium', 0, 0, 0, 'published', 9),
('openclaw', 'OpenClaw', 'https://github.com/openclaw', '开源个人 AI 助手框架，支持多平台集成与本地运行、多模型切换，可自行部署长期在线的私人 Agent。', (SELECT id FROM categories WHERE slug='ai-agent'), '开源,本地,多平台,个人助理', 'opensource', 1, 1, 0, 'published', 10),
('comet', 'Perplexity Comet', 'https://www.perplexity.ai/comet', 'Perplexity 的 AI 原生浏览器，AI 助手内置在页面中，可代写邮件、比价购物与规划行程。', (SELECT id FROM categories WHERE slug='ai-agent'), '浏览器,AI原生,Perplexity', 'freemium', 0, 1, 0, 'published', 11),
('autoglm', 'AutoGLM', 'https://autoglm.zhipuai.cn', '智谱的通用 Agent，任务在云端手机环境中跨应用连续执行，遇到支付与验证码环节会暂停等待确认。', (SELECT id FROM categories WHERE slug='ai-agent'), '手机Agent,云端,智谱,国产', 'free', 0, 1, 0, 'published', 12);

-- ===========================================================================
-- AI 编程开发
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('claude-code', 'Claude Code', 'https://claude.com/product/claude-code', 'Anthropic 的终端 AI 编程 Agent，可在代码库里读文件、改代码、跑测试并自行验证，适合处理跨文件的重构与功能开发。', (SELECT id FROM categories WHERE slug='ai-coding'), '终端Agent,编程,重构,Anthropic', 'paid', 1, 0, 1, 'published', 1),
('cursor', 'Cursor', 'https://cursor.com', 'AI 原生代码编辑器，支持全库索引、多文件编辑与 Agent 模式，是目前最主流的 AI 编程环境之一。', (SELECT id FROM categories WHERE slug='ai-coding'), 'AI IDE,编辑器,Agent,代码补全', 'freemium', 1, 0, 1, 'published', 2),
('github-copilot', 'GitHub Copilot', 'https://github.com/features/copilot', 'GitHub 官方 AI 编程助手，覆盖 IDE 补全、聊天、PR 摘要与代码审查，与 GitHub 工作流无缝衔接。', (SELECT id FROM categories WHERE slug='ai-coding'), '代码补全,IDE,GitHub,审查', 'freemium', 1, 0, 0, 'published', 3),
('codex-cli', 'Codex CLI', 'https://github.com/openai/codex', 'OpenAI 开源的终端编程 Agent，本地沙箱执行、支持并行任务与代码审查，可与 CI 流程结合。', (SELECT id FROM categories WHERE slug='ai-coding'), '开源,终端Agent,OpenAI,沙箱', 'opensource', 0, 0, 0, 'published', 4),
('gemini-cli', 'Gemini CLI', 'https://github.com/google-gemini/gemini-cli', 'Google 开源终端 AI 编程助手，基于 Gemini 模型，提供免费额度，支持大上下文代码库分析与工具调用。', (SELECT id FROM categories WHERE slug='ai-coding'), '开源,终端,Google,免费', 'opensource', 0, 0, 0, 'published', 5),
('cline', 'Cline', 'https://cline.bot', '开源 AI 编程 Agent，可在 VS Code、JetBrains 与 CLI 中运行，支持 MCP、终端执行与浏览器操作。', (SELECT id FROM categories WHERE slug='ai-coding'), '开源,VS Code,MCP,Agent', 'opensource', 0, 0, 0, 'published', 6),
('windsurf', 'Windsurf', 'https://windsurf.com', 'AI 原生 IDE，Cascade 智能体可跨文件执行改动，兼顾自动补全与任务级自动化。', (SELECT id FROM categories WHERE slug='ai-coding'), 'AI IDE,Agent,补全', 'freemium', 0, 0, 0, 'published', 7),
('trae', 'TRAE', 'https://www.trae.ai', '字节跳动的 AI 开发平台，Agent 模式与 IDE 模式自由切换，覆盖 Web、桌面与移动端开发，国内版免费可用。', (SELECT id FROM categories WHERE slug='ai-coding'), 'AI IDE,Agent,字节跳动,国产', 'freemium', 1, 0, 0, 'published', 8),
('opencode', 'OpenCode', 'https://opencode.ai', '开源终端 AI 编程工具，支持多模型接入、本地运行与 MCP，常被视作 Claude Code 的开源替代方案。', (SELECT id FROM categories WHERE slug='ai-coding'), '开源,终端,多模型,MCP', 'opensource', 0, 0, 0, 'published', 9),
('v0', 'v0', 'https://v0.dev', 'Vercel 的 AI 界面生成工具，用对话直接产出可用的 React / Tailwind 组件与完整页面。', (SELECT id FROM categories WHERE slug='ai-coding'), '前端,React,UI生成,Vercel', 'freemium', 1, 0, 0, 'published', 10),
('lovable', 'Lovable', 'https://lovable.dev', 'AI 全栈应用生成工具，用自然语言描述需求即可生成可运行的 Web 应用，并支持一键部署上线。', (SELECT id FROM categories WHERE slug='ai-coding'), '全栈,生成,部署,无代码', 'freemium', 0, 0, 0, 'published', 11),
('bolt', 'Bolt.new', 'https://bolt.new', 'StackBlitz 出品的浏览器内 AI 全栈开发环境，边对话边构建并可直接部署，适合快速验证产品想法。', (SELECT id FROM categories WHERE slug='ai-coding'), '全栈,浏览器,生成,部署', 'freemium', 0, 0, 0, 'published', 12),
('coderabbit', 'CodeRabbit', 'https://www.coderabbit.ai', 'AI 代码审查工具，自动分析 PR 给出可执行的修改建议与总结，支持 GitHub 与 GitLab。', (SELECT id FROM categories WHERE slug='ai-coding'), '代码审查,PR,自动化,Git', 'freemium', 0, 0, 0, 'published', 13),
('devin', 'Devin', 'https://devin.ai', 'Cognition AI 的自主 AI 软件工程师，可端到端完成开发任务、提 PR 与部署，面向工程团队协作。', (SELECT id FROM categories WHERE slug='ai-coding'), '自主Agent,工程,团队', 'paid', 0, 0, 0, 'published', 14),
('aider', 'Aider', 'https://aider.chat', '开源终端 AI 编程助手，擅长大型代码库重构与智能 Git 集成，每次改动自动生成语义化提交。', (SELECT id FROM categories WHERE slug='ai-coding'), '开源,终端,重构,Git', 'opensource', 0, 0, 0, 'published', 15);

-- ===========================================================================
-- AI 办公效率
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('notion-ai', 'Notion AI', 'https://www.notion.com/product/ai', 'Notion 内置的 AI 能力，可在文档与数据库中总结、改写、生成表格与提取要点，并支持跨工作区检索问答。', (SELECT id FROM categories WHERE slug='ai-office'), '笔记,文档,知识库,协作', 'freemium', 1, 0, 0, 'published', 1),
('gamma', 'Gamma', 'https://gamma.app', 'AI 演示文稿与网页生成工具，输入大纲即可生成排版完整的幻灯片、文档与网页，支持一键换主题。', (SELECT id FROM categories WHERE slug='ai-office'), 'PPT,演示,生成,排版', 'freemium', 1, 0, 0, 'published', 2),
('granola', 'Granola', 'https://www.granola.ai', '桌面会议笔记应用，直接采集设备音频而不在会议里插入机器人，会中自动生成结构化笔记与待办。', (SELECT id FROM categories WHERE slug='ai-office'), '会议,笔记,待办,桌面', 'freemium', 0, 1, 0, 'published', 3),
('otter', 'Otter.ai', 'https://otter.ai', '会议语音转写与自动纪工具，实时转录并提取行动项，支持 Zoom、Meet 与 Teams 集成。', (SELECT id FROM categories WHERE slug='ai-office'), '转写,会议,纪要,集成', 'freemium', 0, 0, 0, 'published', 4),
('napkin', 'Napkin AI', 'https://www.napkin.ai', '把文字内容自动转换成信息图与流程图，适合给文档、博客和汇报补充可视化表达。', (SELECT id FROM categories WHERE slug='ai-office'), '可视化,信息图,图表,写作', 'freemium', 0, 0, 0, 'published', 5),
('tome', 'Tome', 'https://tome.app', 'AI 驱动的叙事式演示工具，自动生成页面结构与配图，擅长讲故事型的产品与商业提案。', (SELECT id FROM categories WHERE slug='ai-office'), 'PPT,叙事,演示,提议', 'freemium', 0, 0, 0, 'published', 6),
('mem', 'Mem', 'https://mem.ai', 'AI 原生的个人知识库，自动整理与关联笔记，可对话式检索自己积累的所有资料。', (SELECT id FROM categories WHERE slug='ai-office'), '笔记,知识库,检索,个人', 'paid', 0, 0, 0, 'published', 7),
('excelformulabot', 'Excel Formula Bot', 'https://excelformulabot.com', '用自然语言描述需求即可生成 Excel / Google Sheets 公式，也能解释已有公式与生成 VBA 代码。', (SELECT id FROM categories WHERE slug='ai-office'), '表格,Excel,公式,办公', 'freemium', 0, 0, 0, 'published', 8),
('fireflies', 'Fireflies.ai', 'https://fireflies.ai', '自动记录、转写会议并生成摘要与行动项，支持会议搜索与 CRM 同步，适合销售与项目管理团队。', (SELECT id FROM categories WHERE slug='ai-office'), '会议,CRM,转写,团队', 'freemium', 0, 0, 0, 'published', 9);

-- ===========================================================================
-- AI 写作翻译
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('jasper', 'Jasper', 'https://www.jasper.ai', '面向营销团队的 AI 写作平台，内置品牌语调管理与多渠道内容模板，适合规模化内容生产。', (SELECT id FROM categories WHERE slug='ai-writing'), '营销,品牌,内容,团队', 'paid', 1, 0, 0, 'published', 1),
('copyai', 'Copy.ai', 'https://www.copy.ai', 'AI 营销文案与销售 GTM 自动化平台，可批量生成文案并编排线索挖掘与触达流程。', (SELECT id FROM categories WHERE slug='ai-writing'), '文案,营销,GTM,自动化', 'freemium', 0, 0, 0, 'published', 2),
('grammarly', 'Grammarly', 'https://www.grammarly.com', '英文写作助手，实时检查语法、语气与清晰度，并可用 AI 生成改写版本，适合英文邮件与论文。', (SELECT id FROM categories WHERE slug='ai-writing'), '英文,语法,润色,写作', 'freemium', 1, 0, 0, 'published', 3),
('deepl', 'DeepL', 'https://www.deepl.com', '以译文自然度著称的翻译服务，支持文档翻译与术语表定制，是中英互译的高质量选择。', (SELECT id FROM categories WHERE slug='ai-writing'), '翻译,文档,术语,多语言', 'freemium', 1, 0, 0, 'published', 4),
('writesonic', 'Writesonic', 'https://writesonic.com', 'SEO 导向的 AI 写作工具，支持长文生成、关键词埋入与文章改写，并内置 AI 文章检测与事实核查。', (SELECT id FROM categories WHERE slug='ai-writing'), 'SEO,长文,博客,检测', 'freemium', 0, 0, 0, 'published', 5),
('sudowrite', 'Sudowrite', 'https://www.sudowrite.com', '面向小说与创意写作的 AI 工具，可续写、扩写、改写故事并生成角色设定与情节脑暴。', (SELECT id FROM categories WHERE slug='ai-writing'), '创意写作,小说,续写,脑暴', 'paid', 0, 0, 0, 'published', 6),
('quillbot', 'QuillBot', 'https://quillbot.com', '英文改写与摘要工具，多种改写模式与引用生成，适合处理学术与英文写作素材。', (SELECT id FROM categories WHERE slug='ai-writing'), '改写,摘要,学术,英文', 'freemium', 0, 0, 0, 'published', 7);

-- ===========================================================================
-- AI 图像工具
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('midjourney', 'Midjourney', 'https://www.midjourney.com', '以审美与风格表现力见长的文生图工具，出图质感稳定，适合概念设计、插画与视觉探索。', (SELECT id FROM categories WHERE slug='ai-image'), '文生图,插画,设计,风格', 'paid', 1, 0, 1, 'published', 1),
('stable-diffusion', 'Stable Diffusion', 'https://stability.ai', '开源图像生成模型系列，可本地部署、自由微调与插件扩展，是自建图像生成流水线的标配。', (SELECT id FROM categories WHERE slug='ai-image'), '开源,本地部署,微调,模型', 'opensource', 1, 0, 0, 'published', 2),
('flux', 'FLUX', 'https://blackforestlabs.ai', 'Black Forest Labs 推出的图像生成模型系列，专注文本渲染与写实细节，兼顾开源权重与商用 API。', (SELECT id FROM categories WHERE slug='ai-image'), '文生图,写实,开源,文本渲染', 'freemium', 0, 1, 0, 'published', 3),
('dalle', 'DALL·E', 'https://openai.com/dall-e-3', 'OpenAI 的图像生成模型，可直接在 ChatGPT 中调用，擅长理解复杂提示词并生成准确构图。', (SELECT id FROM categories WHERE slug='ai-image'), '文生图,OpenAI,提示词,构图', 'freemium', 0, 0, 0, 'published', 4),
('leonardo', 'Leonardo.Ai', 'https://leonardo.ai', '面向游戏与设计美术的 AI 图像平台，支持自定义模型训练、实时画布编辑与素材资产管理。', (SELECT id FROM categories WHERE slug='ai-image'), '游戏美术,资产,训练,画布', 'freemium', 0, 0, 0, 'published', 5),
('removebg', 'remove.bg', 'https://www.remove.bg', '一键去除图片背景的在线工具，边缘处理干净，支持批量处理与 API 集成。', (SELECT id FROM categories WHERE slug='ai-image'), '抠图,去背景,批量,API', 'freemium', 0, 0, 0, 'published', 6),
('upscayl', 'Upscayl', 'https://upscayl.org', '开源本地图像放大工具，用 AI 超分提升低清图片与老照片清晰度，完全离线运行。', (SELECT id FROM categories WHERE slug='ai-image'), '超分,放大,开源,本地', 'opensource', 0, 0, 0, 'published', 7),
('photoroom', 'Photoroom', 'https://www.photoroom.com', '电商商品图 AI 工具，自动抠图、换背景与批量生成商品主图，适合跨境电商卖家。', (SELECT id FROM categories WHERE slug='ai-image'), '电商,商品图,抠图,批量', 'freemium', 0, 0, 0, 'published', 8);

-- ===========================================================================
-- AI 视频工具
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('runway', 'Runway', 'https://runwayml.com', 'AI 视频创作平台，提供文生视频、图生视频、视频编辑与特效工具，广泛用于广告与短片制作。', (SELECT id FROM categories WHERE slug='ai-video'), '文生视频,编辑,特效,广告', 'freemium', 1, 0, 1, 'published', 1),
('kling', '可灵 Kling', 'https://klingai.com', '快手推出的 AI 视频生成模型，人物动作与物理一致性表现出色，支持图生视频与视频延长。', (SELECT id FROM categories WHERE slug='ai-video'), '文生视频,国产,图生视频,动作', 'freemium', 1, 0, 1, 'published', 2),
('sora', 'Sora', 'https://openai.com/sora', 'OpenAI 的视频生成模型，擅长长镜头连贯性与物理世界的合理表现，可通过 ChatGPT 与 API 使用。', (SELECT id FROM categories WHERE slug='ai-video'), '文生视频,OpenAI,长镜头', 'paid', 1, 0, 0, 'published', 3),
('hailuo', '海螺 AI', 'https://hailuoai.video', 'MiniMax 的视频生成产品，画面质感与镜头语言表现稳定，支持图生视频与角色一致性。', (SELECT id FROM categories WHERE slug='ai-video'), '文生视频,MiniMax,国产,图生视频', 'freemium', 0, 0, 0, 'published', 4),
('pika', 'Pika', 'https://pika.art', 'AI 视频生成与特效工具，提供多种创意玩法如视频改风格、添加火焰与变形特效，上手门槛低。', (SELECT id FROM categories WHERE slug='ai-video'), '文生视频,特效,创意,风格', 'freemium', 0, 0, 0, 'published', 5),
('heygen', 'HeyGen', 'https://www.heygen.com', 'AI 数字人视频平台，上传文案即可生成口播视频，支持多语言配音与形象克隆，适合出海营销。', (SELECT id FROM categories WHERE slug='ai-video'), '数字人,口播,多语言,营销', 'freemium', 1, 0, 0, 'published', 6),
('descript', 'Descript', 'https://www.descript.com', '以文本编辑视频的创作工具，修改文字稿即可剪视频，支持自动去口癖、补录与多轨混音。', (SELECT id FROM categories WHERE slug='ai-video'), '剪辑,文本编辑,播客,转录', 'freemium', 0, 0, 0, 'published', 7),
('opusclip', 'OpusClip', 'https://www.opus.pro', '长视频自动切条工具，识别高光片段并生成带字幕的竖版短视频，适合内容分发与社媒矩阵。', (SELECT id FROM categories WHERE slug='ai-video'), '切片,短视频,字幕,社媒', 'freemium', 0, 0, 0, 'published', 8),
('veo', 'Veo', 'https://deepmind.google/models/veo/', 'Google DeepMind 的视频生成模型，支持原生音频生成与精细镜头控制，接入 Gemini 与 Vertex AI。', (SELECT id FROM categories WHERE slug='ai-video'), '文生视频,Google,音频,镜头', 'paid', 0, 1, 0, 'published', 9);

-- ===========================================================================
-- AI 音频音乐
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('elevenlabs', 'ElevenLabs', 'https://elevenlabs.io', '业界领先的 AI 语音合成平台，多语言自然度高，支持声音克隆、旁白生成与配音 API 集成。', (SELECT id FROM categories WHERE slug='ai-audio'), '语音合成,克隆,多语言,API', 'freemium', 1, 0, 0, 'published', 1),
('suno', 'Suno', 'https://suno.com', 'AI 音乐生成平台，输入歌词与风格即可产出完整歌曲，含人声、伴奏与混音，可商用。', (SELECT id FROM categories WHERE slug='ai-audio'), '音乐生成,歌曲,人声,创作', 'freemium', 1, 0, 0, 'published', 2),
('udio', 'Udio', 'https://www.udio.com', 'AI 音乐创作工具，擅长复杂编曲与多段结构生成，支持延长、重混与风格迁移。', (SELECT id FROM categories WHERE slug='ai-audio'), '音乐,编曲,重混,风格', 'freemium', 0, 0, 0, 'published', 3),
('whisper', 'Whisper', 'https://github.com/openai/whisper', 'OpenAI 开源的语音识别模型，多语言转写准确度高，可本地部署与二次集成。', (SELECT id FROM categories WHERE slug='ai-audio'), '语音识别,开源,本地,转写', 'opensource', 1, 0, 0, 'published', 4),
('adobe-podcast', 'Adobe Podcast', 'https://podcast.adobe.com', '免费的在线音频增强工具，用 AI 去除录音背景噪声与回声，把手机录音变成接近棚录的效果。', (SELECT id FROM categories WHERE slug='ai-audio'), '降噪,录音,播客,免费', 'free', 0, 0, 0, 'published', 5),
('murf', 'Murf AI', 'https://murf.ai', 'AI 配音与旁白工具，提供大量商业可用音色与语速情绪控制，适合培训课件与产品视频。', (SELECT id FROM categories WHERE slug='ai-audio'), '配音,旁白,商用,视频', 'freemium', 0, 0, 0, 'published', 6),
('lalal', 'LALAL.AI', 'https://www.lalal.ai', 'AI 音轨分离工具，可把歌曲拆分为人声、鼓、贝斯与乐器轨道，用于二创与混音练习。', (SELECT id FROM categories WHERE slug='ai-audio'), '分轨,人声分离,混音,二创', 'freemium', 0, 0, 0, 'published', 7);

-- ===========================================================================
-- AI 设计创意
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('figma-ai', 'Figma AI', 'https://www.figma.com/ai/', 'Figma 内置 AI 能力，支持文生原型、自动重命名图层、批量翻译与设计稿转代码。', (SELECT id FROM categories WHERE slug='ai-design'), 'UI设计,原型,Figma,协作', 'freemium', 1, 0, 0, 'published', 1),
('canva-magic', 'Canva Magic Studio', 'https://www.canva.com/magic-studio/', 'Canva 的 AI 设计套件，覆盖文生设计、自动排版、背景移除与批量改写，让非设计师也能快速出图。', (SELECT id FROM categories WHERE slug='ai-design'), '设计,模板,排版,非设计师', 'freemium', 1, 0, 0, 'published', 2),
('uizard', 'Uizard', 'https://uizard.io', '把手绘草图或文字描述转成可编辑 UI 原型，支持截图转设计与多屏联动，适合快速验证界面构想。', (SELECT id FROM categories WHERE slug='ai-design'), 'UI原型,草图,截图转设计,快速', 'freemium', 0, 0, 0, 'published', 3),
('galileo', 'Galileo AI', 'https://www.usegalileo.ai', '文生 UI 设计工具，描述产品需求即可生成高质量界面与组件，并能导出到 Figma 继续编辑。', (SELECT id FROM categories WHERE slug='ai-design'), 'UI生成,Figma,组件,设计稿', 'paid', 0, 0, 0, 'published', 4),
('looka', 'Looka', 'https://looka.com', 'AI Logo 与品牌套件生成器，可生成标志、配色、字体与完整视觉规范，适合早期品牌搭建。', (SELECT id FROM categories WHERE slug='ai-design'), 'Logo,品牌,配色,视觉规范', 'freemium', 0, 0, 0, 'published', 5),
('khroma', 'Khroma', 'https://www.khroma.co', '用 AI 学习你偏好的配色并生成无限配色方案，帮助快速确定视觉系统的色彩语言。', (SELECT id FROM categories WHERE slug='ai-design'), '配色,色板,视觉,灵感', 'free', 0, 0, 0, 'published', 6);

-- ===========================================================================
-- AI 搜索研究
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('notebooklm', 'NotebookLM', 'https://notebooklm.google.com', 'Google 的 AI 研究笔记工具，上传资料后可在限定语料内问答、生成摘要与播客式音频概览，引用可回溯。', (SELECT id FROM categories WHERE slug='ai-research'), '研究,笔记,引用,播客', 'free', 1, 0, 0, 'published', 1),
('elicit', 'Elicit', 'https://elicit.com', '面向学术研究的 AI 工具，可批量筛选论文、提取数据点并生成文献综述表格，节省系统性回顾时间。', (SELECT id FROM categories WHERE slug='ai-research'), '学术,论文,文献综述,提取', 'freemium', 1, 0, 0, 'published', 2),
('consensus', 'Consensus', 'https://consensus.app', '以科研论文为数据源的 AI 搜索引擎，直接给出研究结论与一致/矛盾证据，适合循证调研。', (SELECT id FROM categories WHERE slug='ai-research'), '论文,循证,证据,搜索', 'freemium', 0, 0, 0, 'published', 3),
('scispace', 'SciSpace', 'https://scispace.com', '论文阅读助手，可解释公式、专业术语与段落，支持与管理文献库对话，读论文效率显著提升。', (SELECT id FROM categories WHERE slug='ai-research'), '论文,阅读,解释,文献库', 'freemium', 0, 0, 0, 'published', 4),
('you', 'You.com', 'https://you.com', '集成多模型的 AI 搜索引擎，提供研究、写作与代码模式，强调隐私与可自定义的搜索体验。', (SELECT id FROM categories WHERE slug='ai-research'), '搜索,多模型,隐私,研究', 'freemium', 0, 0, 0, 'published', 5),
('exa', 'Exa', 'https://exa.ai', '面向 AI 应用的语义搜索引擎，可按含义而非关键词检索网页，并提供 API 供 Agent 调用。', (SELECT id FROM categories WHERE slug='ai-research'), '语义搜索,API,Agent,检索', 'freemium', 0, 1, 0, 'published', 6),
('chatpdf', 'ChatPDF', 'https://www.chatpdf.com', '上传 PDF 后直接用自然语言提问并定位原文位置，适合合同、论文与长篇报告的精读。', (SELECT id FROM categories WHERE slug='ai-research'), 'PDF,问答,定位,精读', 'freemium', 0, 0, 0, 'published', 7);

-- ===========================================================================
-- AI 大模型
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('gpt', 'GPT 系列', 'https://openai.com/api/', 'OpenAI 的旗舰大模型系列，覆盖推理、多模态与工具调用能力，是大量 AI 应用的默认底座。', (SELECT id FROM categories WHERE slug='ai-model'), '模型,OpenAI,推理,多模态', 'paid', 1, 0, 0, 'published', 1),
('llama', 'Llama', 'https://www.llama.com', 'Meta 推出的开放权重模型系列，生态庞大、可自由微调与本地部署，是开源应用最常见的基座。', (SELECT id FROM categories WHERE slug='ai-model'), '开源,权重,Meta,本地部署', 'opensource', 1, 0, 0, 'published', 2),
('qwen-models', 'Qwen', 'https://qwen.ai', '阿里通义千问开放模型系列，覆盖稠密与 MoE、文本与多模态，中文能力强且权重开源。', (SELECT id FROM categories WHERE slug='ai-model'), '开源,中文,多模态,阿里', 'opensource', 1, 0, 0, 'published', 3),
('deepseek-v3', 'DeepSeek V3 / R1', 'https://api-docs.deepseek.com', 'DeepSeek 的开源 MoE 模型与推理模型，以极低的推理成本和突出的数学/代码能力受到广泛采用。', (SELECT id FROM categories WHERE slug='ai-model'), '开源,MoE,推理,低成本', 'opensource', 1, 0, 0, 'published', 4),
('gemma', 'Gemma', 'https://ai.google.dev/gemma', 'Google 开源的轻量模型家族，体积小、效果均衡，适合端侧与资源受限场景部署。', (SELECT id FROM categories WHERE slug='ai-model'), '开源,轻量,端侧,Google', 'opensource', 0, 0, 0, 'published', 5),
('mistral-models', 'Mistral 模型', 'https://mistral.ai/models', 'Mistral AI 的模型系列，包含开源权重与商用版本，欧洲数据合规友好、推理效率高。', (SELECT id FROM categories WHERE slug='ai-model'), '开源,Mistral,欧洲,高效', 'freemium', 0, 0, 0, 'published', 6),
('glm', 'GLM', 'https://www.zhipuai.cn', '智谱 AI 的 GLM 模型系列，中文理解与 Agent 任务能力扎实，提供开源权重与云端 API 两条路径。', (SELECT id FROM categories WHERE slug='ai-model'), '开源,中文,智谱,Agent', 'freemium', 0, 0, 0, 'published', 7);

-- ===========================================================================
-- AI 开发平台
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('huggingface', 'Hugging Face', 'https://huggingface.co', '全球最大的开源模型与数据集社区，模型托管、Spaces 演示与推理端点一站式，AI 开发的默认入口。', (SELECT id FROM categories WHERE slug='ai-platform'), '模型社区,开源,数据集,Spaces', 'freemium', 1, 0, 1, 'published', 1),
('openrouter', 'OpenRouter', 'https://openrouter.ai', '模型 API 聚合平台，用一个接口调用数百个模型并自动路由，方便做成本与效果对比。', (SELECT id FROM categories WHERE slug='ai-platform'), 'API聚合,多模型,路由,对比', 'freemium', 1, 0, 0, 'published', 2),
('ollama', 'Ollama', 'https://ollama.com', '本地运行大模型的开源工具，一行命令即可拉取并运行多种开源模型，提供本地 API。', (SELECT id FROM categories WHERE slug='ai-platform'), '本地,开源,命令行,API', 'opensource', 1, 0, 0, 'published', 3),
('vllm', 'vLLM', 'https://vllm.ai', '高吞吐大模型推理引擎，用 PagedAttention 管理 KV 缓存，是企业自建推理服务的常见选择。', (SELECT id FROM categories WHERE slug='ai-platform'), '推理引擎,高吞吐,自建,KV缓存', 'opensource', 0, 0, 0, 'published', 4),
('langchain', 'LangChain', 'https://www.langchain.com', '主流的 LLM 应用开发框架，提供链式编排、RAG、Agent 与工具调用等核心能力。', (SELECT id FROM categories WHERE slug='ai-platform'), '框架,RAG,Agent,编排', 'opensource', 0, 0, 0, 'published', 5),
('llamaindex', 'LlamaIndex', 'https://www.llamaindex.ai', '面向数据密集场景的 LLM 框架，擅长文档解析、索引构建与检索增强问答。', (SELECT id FROM categories WHERE slug='ai-platform'), '框架,RAG,检索,文档', 'opensource', 0, 0, 0, 'published', 6),
('siliconflow', '硅基流动', 'https://siliconflow.cn', '国产 AI 推理平台，提供多款开源模型的高性价比 API 与算力服务，兼容 OpenAI 接口。', (SELECT id FROM categories WHERE slug='ai-platform'), '推理,API,国产,开源模型', 'freemium', 0, 0, 0, 'published', 7),
('groq', 'Groq', 'https://groq.com', '基于自研 LPU 的超低延迟推理平台，开源模型推理速度突出，开发者有免费额度。', (SELECT id FROM categories WHERE slug='ai-platform'), '推理,低延迟,LPU,免费额度', 'freemium', 0, 0, 0, 'published', 8),
('replicate', 'Replicate', 'https://replicate.com', '云端模型运行平台，一行代码调用上千个开源模型，按秒计费，也支持发布自己的模型。', (SELECT id FROM categories WHERE slug='ai-platform'), '模型托管,按秒计费,开源,部署', 'freemium', 0, 0, 0, 'published', 9),
('cloudflare-workers-ai', 'Cloudflare Workers AI', 'https://developers.cloudflare.com/workers-ai/', '在 Cloudflare 边缘网络上直接运行推理模型，无需自建 GPU，与 Workers 与 D1 无缝组合。', (SELECT id FROM categories WHERE slug='ai-platform'), '边缘推理,Serverless,Cloudflare,Worker', 'freemium', 0, 1, 0, 'published', 10),
('modal', 'Modal', 'https://modal.com', '云端函数与容器平台，按秒计费托管 GPU 推理与训练任务，冷启动优化好，适合弹性负载。', (SELECT id FROM categories WHERE slug='ai-platform'), 'Serverless,GPU,训练,弹性', 'freemium', 0, 0, 0, 'published', 11);

-- ===========================================================================
-- AI 新媒体
-- ===========================================================================
INSERT INTO tools (slug, name, url, description, category_id, tags, pricing, is_hot, is_new, is_featured, status, sort_order) VALUES
('moban-editor', '公众号排版编辑器', 'https://mdnice.com', 'Markdown 排版工具，主题丰富，可一键复制到微信公众号后台并保持样式，适合长文与技术内容。', (SELECT id FROM categories WHERE slug='ai-media'), '公众号,排版,Markdown,长文', 'free', 0, 0, 0, 'published', 1),
('typora', 'Typora', 'https://typora.io', '极简 Markdown 编辑器，所见即所得与导出 PDF/HTML 能力出色，适合写作与文档整理。', (SELECT id FROM categories WHERE slug='ai-media'), 'Markdown,写作,编辑器,导出', 'paid', 0, 0, 0, 'published', 2),
('huashu', 'AI 绘图助手', 'https://www.midjourney.com', '借助文生图工具快速产出文章配图与封面，配合提示词模板可以批量生成统一风格的视觉素材。', (SELECT id FROM categories WHERE slug='ai-media'), '配图,封面,批量,模板', 'paid', 0, 0, 0, 'published', 3),
('buffer-ai', 'Buffer AI', 'https://buffer.com', '社交媒体排程工具，内置 AI 助手生成与改写帖子文案，支持多平台统一调度发布。', (SELECT id FROM categories WHERE slug='ai-media'), '社媒,排程,文案,多平台', 'freemium', 0, 0, 0, 'published', 4),
('pictory', 'Pictory', 'https://pictory.ai', '把长文章或脚本自动转成带字幕与配图的短视频，适合把图文内容二次分发到视频平台。', (SELECT id FROM categories WHERE slug='ai-media'), '图文转视频,字幕,分发,短视频', 'paid', 0, 0, 0, 'published', 5);
