-- ===========================================================================
-- Migration 006: unique Chinese category intros.
--
-- Replaces the short one-line descriptions with 150–250 character intros so
-- each category page has its own body copy instead of the same template with
-- only the category name swapped.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/006_category_intros.sql
--
-- Idempotent UPDATEs keyed by slug.
-- ===========================================================================

UPDATE categories SET description =
'对话助手是使用频率最高的一类 AI 工具，覆盖日常问答、写作、翻译、分析与多轮推理。选型时重点看上下文长度、是否支持联网与文件上传、免费额度，以及中文表达是否自然；如果经常处理长文档，优先考虑长上下文更强的产品。'
WHERE slug = 'ai-chat';

UPDATE categories SET description =
'智能体不再只回答问题，而是能拆解任务、调用工具并跨应用执行。适合自动化重复流程、信息收集与多步骤操作。选型时重点看可控性、权限边界、失败重试和可观测性，涉及账号与支付的操作建议先在小范围试用。'
WHERE slug = 'ai-agent';

UPDATE categories SET description =
'编程类 AI 工具覆盖代码补全、终端智能体、AI IDE 与代码审查。选型时不要只看补全速度，还要看仓库级上下文、对既有技术栈的适配、改动可审阅性，以及团队协作与权限管理；个人项目可以先用免费额度验证准确率。'
WHERE slug = 'ai-coding';

UPDATE categories SET description =
'办公效率类工具把 AI 嵌入文档、表格、演示、会议纪要与知识管理。选型时重点看它是否融入现有工作流、能否引用企业知识库、导出格式是否完整，以及数据是否会被用于训练；涉及公司资料时先确认隐私条款。'
WHERE slug = 'ai-office';

UPDATE categories SET description =
'写作与翻译类工具覆盖长文创作、SEO 内容、润色、改写与多语言翻译。选型时重点看中文语感、长文结构能力、术语一致性，以及是否支持自定义风格与批量处理；翻译类还要关注专业领域词库和人工校对成本。'
WHERE slug = 'ai-writing';

UPDATE categories SET description =
'图像类工具覆盖文生图、图像编辑、抠图、放大与设计素材生成。选型时重点看出图风格是否可控、中文提示词理解、商用授权与版权归属，以及批量生成和后期编辑的衔接；做品牌素材时优先选择授权清晰的工具。'
WHERE slug = 'ai-image';

UPDATE categories SET description =
'视频类工具覆盖文生视频、剪辑、数字人与口播生成。选型时重点看时长与分辨率限制、镜头一致性、生成速度与失败率，以及是否支持中文脚本和字幕；商业项目还要确认素材授权、水印与导出规格。'
WHERE slug = 'ai-video';

UPDATE categories SET description =
'音频类工具覆盖语音合成、音乐生成、语音识别与音频处理。选型时重点看音色自然度、中文多音字与情感表达、识别准确率、导出格式，以及商用授权；做播客或有声书时建议先试听同一段文本的效果。'
WHERE slug = 'ai-audio';

UPDATE categories SET description =
'设计创意类工具覆盖 UI 生成、视觉设计、配色与创意灵感。选型时重点看是否支持设计系统与组件规范、导出是否可用、协作与版本管理，以及生成结果的可编辑性；它更适合做初稿和变体，而不是完全替代设计判断。'
WHERE slug = 'ai-design';

UPDATE categories SET description =
'搜索研究类工具覆盖 AI 搜索引擎、深度研究、文献阅读与资料整理。选型时重点看信息来源是否可追溯、引用是否准确、是否支持长文档与多语言，以及会不会编造不存在的出处；做严谨研究时务必逐条核对原文。'
WHERE slug = 'ai-research';

UPDATE categories SET description =
'大模型类目收录基础模型与开源权重模型系列，适合做技术选型、私有化部署与二次开发。选型时重点看上下文长度、推理与代码能力、许可证、部署成本与中文表现；开源模型还要评估社区活跃度和微调工具链。'
WHERE slug = 'ai-model';

UPDATE categories SET description =
'开发平台类工具提供模型 API、推理服务、应用框架与工作流编排。选型时重点看稳定性与限流、价格与计费方式、数据合规、SDK 与文档质量，以及能否平滑切换模型；生产环境建议准备至少一家备用供应商。'
WHERE slug = 'ai-platform';

UPDATE categories SET description =
'新媒体类工具覆盖公众号排版、短视频制作、社媒排程与内容分发。选型时重点看模板与品牌一致性、批量生产与多平台同步、数据统计，以及是否支持团队协作；内容团队优先选择能把选题、生产、发布串起来的工具。'
WHERE slug = 'ai-media';
