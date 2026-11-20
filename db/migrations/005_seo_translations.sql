-- ===========================================================================
-- Migration 005: SEO copy + en/ja/ko translations.
--
-- Fills the category names/descriptions used by the category pages and the
-- two live tool entries, so /en, /ja and /ko stop falling back to Chinese
-- body copy. Content added later should set the same `_en/_ja/_ko` columns;
-- nothing in the templates needs to change.
--
--   local : npm run db:migrate:local
--   remote: npx wrangler d1 execute somarkit --remote --file=./db/migrations/005_seo_translations.sql
--
-- Safe to re-run: every statement is an idempotent UPDATE keyed by slug.
-- ===========================================================================

-- --- categories: names (ja/ko) + descriptions (en/ja/ko) ------------------

UPDATE categories SET
  name_ja = 'AI チャット',
  name_ko = 'AI 채팅',
  description_en = 'General-purpose chat assistants for Q&A, writing, analysis and multi-turn reasoning.',
  description_ja = '日常の質問応答・執筆・分析・多段推論に対応する汎用チャット製品。',
  description_ko = '일상 질의응답, 글쓰기, 분석, 다중 턴 추론을 지원하는 범용 대화 제품.'
WHERE slug = 'ai-chat';

UPDATE categories SET
  name_ja = 'AI エージェント',
  name_ko = 'AI 에이전트',
  description_en = 'Agents that plan tasks, call tools and act across applications.',
  description_ja = 'タスクを自律的に分解し、ツールを呼び出し、アプリをまたいで実行するエージェント。',
  description_ko = '작업을 스스로 분해하고 도구를 호출해 앱을 넘나들며 실행하는 에이전트.'
WHERE slug = 'ai-agent';

UPDATE categories SET
  name_ja = 'AI コーディング',
  name_ko = 'AI 코딩',
  description_en = 'Code completion, terminal agents, AI IDEs and code review.',
  description_ja = 'コード補完、ターミナルエージェント、AI IDE、コードレビューをカバー。',
  description_ko = '코드 완성, 터미널 에이전트, AI IDE, 코드 리뷰를 아우르는 개발 도구.'
WHERE slug = 'ai-coding';

UPDATE categories SET
  name_ja = 'AI オフィス',
  name_ko = 'AI 오피스',
  description_en = 'Documents, spreadsheets, slides, meeting notes and knowledge management.',
  description_ja = '文書・表計算・プレゼン・議事録・ナレッジ管理のための AI ツール。',
  description_ko = '문서, 스프레드시트, 프레젠테이션, 회의록, 지식 관리를 위한 AI 도구.'
WHERE slug = 'ai-office';

UPDATE categories SET
  name_ja = 'AI ライティング',
  name_ko = 'AI 글쓰기',
  description_en = 'Long-form writing, SEO content, translation and polishing.',
  description_ja = '長文執筆、SEO コンテンツ、翻訳、推敲のためのツール。',
  description_ko = '장문 작성, SEO 콘텐츠, 번역, 첨삭을 위한 도구.'
WHERE slug = 'ai-writing';

UPDATE categories SET
  name_ja = 'AI 画像',
  name_ko = 'AI 이미지',
  description_en = 'Text-to-image, editing, background removal and design asset generation.',
  description_ja = 'テキストから画像生成、編集、背景除去、デザイン素材の生成。',
  description_ko = '텍스트에서 이미지 생성, 편집, 배경 제거, 디자인 소재 생성.'
WHERE slug = 'ai-image';

UPDATE categories SET
  name_ja = 'AI 動画',
  name_ko = 'AI 영상',
  description_en = 'Text-to-video, editing, digital avatars and talking-head generation.',
  description_ja = 'テキストから動画生成、編集、デジタルヒューマン、ナレーション生成。',
  description_ko = '텍스트에서 영상 생성, 편집, 디지털 휴먼, 낭독 영상 생성.'
WHERE slug = 'ai-video';

UPDATE categories SET
  name_ja = 'AI 音声・音楽',
  name_ko = 'AI 오디오·음악',
  description_en = 'Speech synthesis, music generation, transcription and audio processing.',
  description_ja = '音声合成、音楽生成、音声認識、オーディオ処理。',
  description_ko = '음성 합성, 음악 생성, 음성 인식, 오디오 처리.'
WHERE slug = 'ai-audio';

UPDATE categories SET
  name_ja = 'AI デザイン',
  name_ko = 'AI 디자인',
  description_en = 'UI generation, visual design and creative inspiration.',
  description_ja = 'UI 生成、ビジュアルデザイン、アイデア出しのためのツール。',
  description_ko = 'UI 생성, 비주얼 디자인, 아이디어 발상을 위한 도구.'
WHERE slug = 'ai-design';

UPDATE categories SET
  name_ja = 'AI リサーチ',
  name_ko = 'AI 리서치',
  description_en = 'AI search engines, deep research and material organisation.',
  description_ja = 'AI 検索エンジン、リサーチ、資料整理。',
  description_ko = 'AI 검색 엔진, 심층 리서치, 자료 정리.'
WHERE slug = 'ai-research';

UPDATE categories SET
  name_ja = 'AI 基盤モデル',
  name_ko = 'AI 파운데이션 모델',
  description_en = 'Foundation models and open-weight model series.',
  description_ja = '基盤モデルとオープンウェイトのモデルシリーズ。',
  description_ko = '파운데이션 모델 및 오픈 웨이트 모델 시리즈.'
WHERE slug = 'ai-model';

UPDATE categories SET
  name_ja = 'AI 開発プラットフォーム',
  name_ko = 'AI 개발 플랫폼',
  description_en = 'Model APIs, inference platforms and application frameworks.',
  description_ja = 'モデル API、推論プラットフォーム、アプリ開発フレームワーク。',
  description_ko = '모델 API, 추론 플랫폼, 앱 개발 프레임워크.'
WHERE slug = 'ai-platform';

UPDATE categories SET
  name_ja = 'AI メディア',
  name_ko = 'AI 미디어',
  description_en = 'AI tools for newsletters, short video and content operations.',
  description_ja = 'ニュースレター、ショート動画、コンテンツ運用を効率化する AI ツール。',
  description_ko = '뉴스레터, 숏폼 영상, 콘텐츠 운영을 효율화하는 AI 도구.'
WHERE slug = 'ai-media';

-- --- live tools -----------------------------------------------------------

UPDATE tools SET
  description_en = 'OpenAI''s general-purpose AI assistant, with GPT models, web search, image understanding, file analysis and custom GPTs — one of the most widely used conversational AI products.',
  description_ja = 'OpenAI の汎用 AI アシスタント。GPT シリーズ、Web 検索、画像理解、ファイル分析、カスタム GPTs に対応し、最も広く使われている対話型 AI のひとつです。',
  description_ko = 'OpenAI의 범용 AI 어시스턴트로, GPT 시리즈 모델, 웹 검색, 이미지 이해, 파일 분석, 커스텀 GPTs를 지원하는 대표적인 대화형 AI입니다.',
  tags_en = 'Chat,Writing,Coding,Multimodal',
  tags_ja = '対話,執筆,コーディング,マルチモーダル',
  tags_ko = '대화,글쓰기,코딩,멀티모달'
WHERE slug = 'chatgpt';

UPDATE tools SET
  description_en = 'Anthropic''s AI assistant, known for long-document understanding, careful reasoning and coding, with Artifacts previews and Projects workspaces for complex analysis.',
  description_ja = 'Anthropic の AI アシスタント。長文理解、慎重な推論、コーディングに強く、Artifacts のプレビューと Projects で複雑な分析に向いています。',
  description_ko = 'Anthropic의 AI 어시스턴트로, 장문 이해, 신중한 추론, 코딩 능력이 뛰어나며 Artifacts 미리보기와 Projects 작업 공간을 지원합니다.',
  tags_en = 'Chat,Long context,Coding,Analysis',
  tags_ja = '対話,長文,コーディング,分析',
  tags_ko = '대화,장문,코딩,분석'
WHERE slug = 'claude';
