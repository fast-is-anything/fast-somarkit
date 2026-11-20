-- ===========================================================================
-- Migration 007: editorial reviews for the two live tools.
--
-- Four locales per tool. The page template normalises the top heading of each
-- body to H2, so `##` here renders as H2/H3 without creating a second H1.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/007_tool_reviews.sql
--
-- Idempotent UPDATEs keyed by slug.
-- ===========================================================================

UPDATE tools SET
review_md =
'## 一句话结论
ChatGPT 仍是综合能力最均衡的通用 AI 助手：问答、写作、文件分析、图片理解都能覆盖。如果你更看重长文推理或代码，可以同时对比 Claude。

## 核心功能
- 多模态理解：可以读取图片、截图和文档，并基于内容继续追问。
- 联网搜索：需要最新信息时主动检索，并在回答里给出参考链接。
- 自定义 GPTs：把常用提示词、知识和工具封装成可复用助手。
- 文件与数据分析：上传 PDF、表格后可以直接总结、提问或生成图表。
- 语音与记忆：支持语音对话，并可在授权后保留偏好与上下文。

## 定价
免费版覆盖基础模型和有限次数的高级能力；Plus 约 20 美元/月，适合高频个人用户；Team 与 Enterprise 面向协作、权限与合规需求。具体额度和价格以官网为准。

## 优点与缺点
优点是生态成熟、第三方集成多、移动端完整、中文表现稳定。缺点是高级模型和深度研究有次数限制，长对话仍可能丢失早期约束，部分地区访问不稳定。

## 适合谁
需要一款什么都能做一点的通用助手、经常处理图片/文件/写作任务、希望有成熟移动端和插件生态的个人与小团队。

## 替代工具
Claude 更适合长文与代码；Gemini 与 Google 生态结合更紧；DeepSeek 在推理与价格上更有竞争力。

## 常见问题
免费版够用吗？轻度问答和写作够用，高频使用建议 Plus。支持中文吗？支持，中文写作与理解表现稳定。',
review_md_en =
'## Verdict
ChatGPT remains the most balanced general-purpose assistant: Q&A, writing, file analysis and image understanding all work well. If long-form reasoning or coding matters most, compare it with Claude.

## What it does
- Multimodal input: read images, screenshots and documents, then keep asking about them.
- Web search: retrieves current information and cites sources.
- Custom GPTs: package prompts, knowledge and tools into reusable assistants.
- File and data analysis: upload PDFs or spreadsheets, then summarise, question or chart them.
- Voice and memory: voice conversations, with optional memory of preferences and context.

## Pricing
The free tier covers the base model and a limited amount of advanced usage. Plus is about USD 20 per month for heavy individual use; Team and Enterprise add collaboration, permissions and compliance. Check the official site for current limits and prices.

## Pros and cons
Pros: mature ecosystem, many integrations, solid mobile apps and stable Chinese output. Cons: usage caps on advanced models and deep research, long conversations can lose early constraints, and access is unreliable in some regions.

## Who it is for
People who want one general assistant for many tasks, frequently work with images, files and writing, and value a mature mobile and plugin ecosystem.

## Alternatives
Claude is stronger for long documents and code; Gemini is tightly integrated with Google; DeepSeek is competitive on reasoning and price.

## FAQ
Is the free tier enough? For light Q&A and writing, yes; for daily heavy use, Plus is worth it. Does it support Chinese? Yes, both writing and comprehension are stable.',
review_md_ja =
'## 結論
ChatGPT は総合力の高い汎用 AI アシスタントです。文章作成、質問応答、ファイル分析、画像理解まで一通りこなせます。長文推論やコーディングを重視するなら Claude と比較するのがおすすめです。

## 主な機能
- マルチモーダル：画像・スクリーンショット・文書を読み取り、内容について質問できます。
- Web 検索：最新情報が必要なときに検索し、参考リンクを示します。
- カスタム GPTs：よく使うプロンプトや知識を再利用可能なアシスタントにできます。
- ファイル分析：PDF や表をアップロードして要約・質問・グラフ化が可能です。
- 音声とメモリ：音声会話に対応し、許可すれば好みや文脈を保持します。

## 料金
無料版は基本モデルと回数制限付きの上位機能を利用できます。Plus は月額約 20 ドルで個人のヘビーユーザー向け、Team / Enterprise は権限管理やコンプライアンス向けです。料金と上限は公式サイトを確認してください。

## 長所と短所
長所はエコシステムの成熟、連携サービスの多さ、モバイル体験、安定した日本語処理です。短所は上位モデルと深い調査に回数制限があること、長い会話で初期条件を忘れること、地域によってアクセスが不安定なことです。

## 向いている人
何でも一通り任せたい人、画像・ファイル・文章を頻繁に扱う人、モバイルと連携機能を重視する個人・小規模チーム。

## 代替ツール
Claude は長文とコードに強く、Gemini は Google 連携、DeepSeek は推論と価格のバランスに優れています。

## よくある質問
無料版で足りますか。軽い質問や文章作成なら十分で、毎日使うなら Plus がおすすめです。日本語に対応していますか。はい、文章作成と理解の両方で安定しています。',
review_md_ko =
'## 결론
ChatGPT는 여전히 가장 균형 잡힌 범용 AI 어시스턴트입니다. 질의응답, 글쓰기, 파일 분석, 이미지 이해를 모두 처리합니다. 긴 문서 추론이나 코딩이 중요하다면 Claude와 비교해 보세요.

## 주요 기능
- 멀티모달: 이미지, 스크린샷, 문서를 읽고 내용에 대해 이어서 질문할 수 있습니다.
- 웹 검색: 최신 정보가 필요할 때 검색하고 참고 링크를 제시합니다.
- 커스텀 GPTs: 자주 쓰는 프롬프트와 지식을 재사용 가능한 어시스턴트로 만들 수 있습니다.
- 파일 분석: PDF나 표를 업로드해 요약, 질문, 차트 생성을 할 수 있습니다.
- 음성과 메모리: 음성 대화를 지원하고, 허용하면 선호와 맥락을 기억합니다.

## 가격
무료 버전은 기본 모델과 제한된 고급 기능을 제공합니다. Plus는 월 약 20달러로 개인 고사용자에게 적합하고, Team과 Enterprise는 협업·권한·규정 준수를 위한 옵션입니다. 정확한 한도와 가격은 공식 사이트를 확인하세요.

## 장점과 단점
장점은 성숙한 생태계, 다양한 연동, 완성도 높은 모바일 앱, 안정적인 한국어 처리입니다. 단점은 고급 모델과 심층 리서치의 사용 횟수 제한, 긴 대화에서 초기 조건을 잊는 점, 일부 지역의 접속 불안정입니다.

## 추천 대상
여러 작업을 하나의 도구로 처리하려는 사람, 이미지·파일·글쓰기를 자주 다루는 사람, 모바일과 연동 기능을 중시하는 개인과 소규모 팀.

## 대안
Claude는 긴 문서와 코드에 강하고, Gemini는 Google 생태계, DeepSeek은 추론과 가격 경쟁력이 있습니다.

## 자주 묻는 질문
무료 버전으로 충분한가요? 가벼운 질의와 글쓰기에는 충분하며 매일 사용한다면 Plus를 권합니다. 한국어를 지원하나요? 네, 글쓰기와 이해 모두 안정적입니다.'
WHERE slug = 'chatgpt';

UPDATE tools SET
review_md =
'## 一句话结论
Claude 的优势集中在长文本理解、严谨推理与代码任务，Artifacts 和 Projects 让长文分析更顺手。如果你每天主要做对话问答，ChatGPT 的生态更全面；如果经常读长文档、改代码，Claude 更值得优先试用。

## 核心功能
- 长上下文：适合整份报告、论文、合同和多文件对比。
- Artifacts：把生成的文档、代码或页面放到侧边实时预览和修改。
- Projects：按项目组织资料与对话，减少重复上传背景。
- 代码能力：解释、重构和调试代码的表现稳定。
- 风格控制：回答克制、结构化，适合需要严谨表述的场景。

## 定价
免费版有每日额度；Pro 约 20 美元/月，适合高频长文与代码用户；Team 与 Enterprise 面向协作、权限和管理需求。具体额度以官网为准。

## 优点与缺点
优点是长文理解强、回答严谨、Artifacts 预览体验好、代码任务可靠。缺点是高峰期限流、部分格式的文件解析一般、生态和第三方插件不如 ChatGPT 丰富。

## 适合谁
经常处理长文档、论文、合同、代码库的创作者、研究者和开发者，以及更看重回答质量而不是插件数量的人。

## 替代工具
ChatGPT 生态更全；Gemini 适合 Google 工作流；DeepSeek 在代码与推理上性价比高。

## 常见问题
Claude 能读多长的文档？具体上下文长度随模型和套餐变化，以官网为准。适合写代码吗？适合解释、重构和调试，但复杂项目仍建议配合测试与代码审查。',
review_md_en =
'## Verdict
Claude stands out for long-document understanding, careful reasoning and coding, with Artifacts and Projects making long-form work easier. If you mainly want a broad everyday assistant, ChatGPT has the wider ecosystem; if you read long documents and edit code every day, try Claude first.

## What it does
- Long context: whole reports, papers, contracts and multi-file comparisons.
- Artifacts: preview and revise generated documents, code or pages side by side.
- Projects: keep source material and conversations organised per project.
- Coding: stable at explaining, refactoring and debugging code.
- Controlled style: measured, structured answers for work that needs precision.

## Pricing
The free tier has a daily allowance; Pro is about USD 20 per month for heavy long-document and coding use; Team and Enterprise add collaboration, permissions and admin controls. Check the official site for current limits.

## Pros and cons
Pros: strong long-document understanding, careful answers, useful Artifacts previews and reliable coding. Cons: rate limits at peak times, some file formats parse poorly, and the plugin ecosystem is smaller than ChatGPT.

## Who it is for
Writers, researchers and developers who work with long documents, papers, contracts or codebases, and who value answer quality over plugin quantity.

## Alternatives
ChatGPT has the broader ecosystem; Gemini fits Google workflows; DeepSeek is strong value for code and reasoning.

## FAQ
How much can Claude read? Context limits vary by model and plan; check the official site. Is it good for coding? Yes for explanation, refactoring and debugging, though complex projects still need tests and code review.',
review_md_ja =
'## 結論
Claude は長文理解、慎重な推論、コーディングに強く、Artifacts と Projects によって長い資料の作業がしやすいのが特徴です。日常的に幅広く使うなら ChatGPT、長文とコードを毎日扱うなら Claude を先に試す価値があります。

## 主な機能
- 長いコンテキスト：報告書、論文、契約書、複数ファイルの比較に向いています。
- Artifacts：生成した文書・コード・ページを横でプレビューしながら修正できます。
- Projects：資料と会話をプロジェクト単位で整理できます。
- コーディング：コードの説明、リファクタリング、デバッグが安定しています。
- 文体：控えめで構造化された回答が多く、正確さが求められる作業に向いています。

## 料金
無料版は1日あたりの利用枠があり、Pro は月額約 20 ドルで長文・コード中心のヘビーユーザー向け、Team / Enterprise は協業・権限・管理向けです。上限は公式サイトを確認してください。

## 長所と短所
長所は長文理解、慎重な回答、Artifacts のプレビュー、コード作業の安定性です。短所は混雑時の制限、一部ファイル形式の解析、ChatGPT より狭い連携エコシステムです。

## 向いている人
長い文書、論文、契約書、コードベースを扱う書き手・研究者・開発者で、プラグインの数より回答の質を重視する人。

## 代替ツール
ChatGPT はエコシステムが広く、Gemini は Google 連携、DeepSeek はコードと推論のコスト効率に優れています。

## よくある質問
どれくらいの長さを読めますか。上限はモデルとプランで変わるため公式サイトを確認してください。コーディングに向いていますか。説明・リファクタリング・デバッグに適していますが、複雑な案件はテストとレビューも必要です。',
review_md_ko =
'## 결론
Claude는 장문 이해, 신중한 추론, 코딩에 강점이 있고 Artifacts와 Projects 덕분에 긴 자료 작업이 편합니다. 폭넓은 일상 비서가 필요하면 ChatGPT, 긴 문서와 코드를 매일 다룬다면 Claude를 먼저 시험해 볼 만합니다.

## 주요 기능
- 긴 컨텍스트: 보고서, 논문, 계약서, 여러 파일 비교에 적합합니다.
- Artifacts: 생성한 문서·코드·페이지를 옆에서 미리 보며 수정할 수 있습니다.
- Projects: 자료와 대화를 프로젝트 단위로 정리합니다.
- 코딩: 코드 설명, 리팩터링, 디버깅이 안정적입니다.
- 문체: 차분하고 구조화된 답변으로 정확성이 중요한 작업에 맞습니다.

## 가격
무료 버전은 일일 사용량이 있고, Pro는 월 약 20달러로 장문·코드 중심 고사용자에게 적합합니다. Team과 Enterprise는 협업·권한·관리 기능을 제공합니다. 정확한 한도는 공식 사이트를 확인하세요.

## 장점과 단점
장점은 강한 장문 이해, 신중한 답변, Artifacts 미리보기, 안정적인 코딩입니다. 단점은 피크 시간대 제한, 일부 파일 형식의 낮은 해석 품질, ChatGPT보다 좁은 연동 생태계입니다.

## 추천 대상
긴 문서, 논문, 계약서, 코드베이스를 다루는 작성자·연구자·개발자 중 플러그인 수보다 답변 품질을 중시하는 사람.

## 대안
ChatGPT는 생태계가 넓고, Gemini는 Google 워크플로, DeepSeek은 코드와 추론의 가격 경쟁력이 있습니다.

## 자주 묻는 질문
얼마나 긴 문서를 읽을 수 있나요? 모델과 요금제에 따라 다르므로 공식 사이트를 확인하세요. 코딩에 적합한가요? 설명·리팩터링·디버깅에 적합하지만 복잡한 프로젝트는 테스트와 리뷰가 필요합니다.'
WHERE slug = 'claude';
