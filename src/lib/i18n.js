// -----------------------------------------------------------------------------
// i18n — UI string dictionaries.
// Content (tool names, descriptions, category names) is administrator-authored
// and published as-is; only the interface chrome is translated.
// -----------------------------------------------------------------------------

/**
 * Site languages, in display order. The first entry is the default language
 * and owns the bare database columns (`name`, `description`, `tags`,
 * `review_md`); every later entry stores its translation in
 * `<field>_<code>` columns.
 *
 *   code        URL prefix and database column suffix (`/ja/…`, `name_ja`)
 *   label       native language name, shown in the language switcher
 *   short       compact badge shown when the switcher is collapsed
 *   htmlLang    value of <html lang> and the schema.org inLanguage
 *   ogLocale    value of <meta property="og:locale">
 */
export const LANGS = [
  { code: 'zh', label: '中文', short: '中', htmlLang: 'zh-CN', ogLocale: 'zh_CN' },
  { code: 'en', label: 'English', short: 'EN', htmlLang: 'en', ogLocale: 'en_US' },
  { code: 'ja', label: '日本語', short: '日', htmlLang: 'ja', ogLocale: 'ja_JP' },
  { code: 'ko', label: '한국어', short: '한', htmlLang: 'ko', ogLocale: 'ko_KR' },
];

export const DEFAULT_LANG = LANGS[0].code;

/**
 * Language served by the bare URLs (`/`, `/tools/x`, …) that carry no locale
 * prefix. It used to mirror DEFAULT_LANG (Chinese); the unprefixed addresses now
 * render English, which is the site's primary language for first-time visitors.
 *
 * This is deliberately separate from DEFAULT_LANG: DEFAULT_LANG also decides
 * which database columns are the "bare" ones (`name`, `description`, `tags`,
 * `review_md`), and those are Chinese content. Reordering LANGS would make every
 * locale read the wrong columns, so only the alias's language changes here.
 */
export const UNPREFIXED_LANG = 'en';

export function normalizeLang(v) {
  return LANGS.some((l) => l.code === v) ? v : DEFAULT_LANG;
}

// -----------------------------------------------------------------------------
// Locale-prefixed routing.
//
// Every public page lives under a language prefix, one per entry in LANGS
// (`/zh/...`, `/en/...`, `/ja/...`, `/ko/...`). The language is decided by the
// URL alone — no cookie, no Accept-Language sniffing — so a shared link always
// renders in one language and crawlers get exactly what users get. Adding a
// locale to LANGS therefore adds its routes and its hreflang set too.
// -----------------------------------------------------------------------------

const LOCALE_CODES = LANGS.map((l) => l.code);

const LOCALE_PREFIX = new RegExp(`^/(${LOCALE_CODES.join('|')})(?=/|$)`);

/**
 * Split a pathname into its language and the language-neutral remainder.
 *
 *   '/zh'            → { lang: 'zh', rest: '/',  matched: true  }
 *   '/en/tools/x'    → { lang: 'en', rest: '/tools/x', matched: true }
 *   '/ja'            → { lang: 'ja', rest: '/',  matched: true  }
 *   '/tools/x'       → { lang: null, rest: '/tools/x', matched: false }
 *
 * Callers treat `matched: false` on public routes as an unprefixed alias that
 * renders in the default language (see the router for the canonical rules).
 */
export function splitLocale(pathname) {
  const path = pathname || '/';
  const m = path.match(LOCALE_PREFIX);
  if (!m) return { lang: null, rest: path, matched: false };
  const rest = path.slice(m[0].length);
  return { lang: m[1], rest: rest === '' ? '/' : rest, matched: true };
}

/** Prefix a language-neutral path for one locale. Always returns `/xx/...`. */
export function localePath(lang, path = '/') {
  const code = normalizeLang(lang);
  const p = String(path || '/');
  if (p === '/' || p === '') return `/${code}`;
  return `/${code}${p.startsWith('/') ? p : `/${p}`}`;
}

/**
 * Translate a path from one locale to another, keeping the rest of the URL.
 * Used by the language switcher so clicking "English" lands on the same page.
 */
export function switchLocalePath(currentLang, targetLang, pathname, search = '') {
  const { rest } = splitLocale(pathname);
  return localePath(targetLang, rest) + (search || '');
}

const DICT = {
  zh: {
    'nav.allTools': '全部工具',
    'nav.search': '搜索 AI 工具…',
    'nav.searchAria': '搜索 AI 工具',
    'nav.language': '切换语言',
    'nav.theme': '切换主题',
    'nav.categories': '分类',
    'nav.submit': '提交工具',

    'hero.title.1': '每个好工具，',
    'hero.title.2': '都值得被标记',
    'hero.subtitle': (n, c) => `${n} 款 AI 利器，${c} 路门派，已替你选好一轮。`,
    'hero.searchPlaceholder': '搜索工具名称、功能、标签…',
    'hero.searchPlaceholderShort': '搜索工具…',
    'hero.searchAria': '全站搜索',
    'hero.searchBtn': '搜索',
    'hero.statTools': '收录工具',
    'hero.statCategories': '工具分类',
    'hero.statUpdate': '持续更新',
    'hero.statUpdateValue': '每周',
    'hero.featured': '近期最火 AI 工具',

    'content.title': '工具列表',
    'content.toolsCount': (n) => `共 ${n} 个工具`,
    'content.filtered': (n) => `筛选出 ${n} 个工具`,
    'content.filterAria': '按定价筛选',
    'content.viewAll': '查看全部',

    'pricing.all': '全部',
    'pricing.free': '免费',
    'pricing.freemium': '免费增值',
    'pricing.paid': '付费',
    'pricing.opensource': '开源',

    'card.review': '评测',
    'card.opening': '正在前往',
    'card.visit': '访问',
    'card.noDesc': '暂无描述',

    'badge.hot': '🔥 热门',
    'badge.new': '✦ 新品',

    'empty.title': '没有找到匹配的工具',
    'empty.hint': '换个关键词试试，或者',
    'empty.clear': '清除筛选条件',

    'sidebar.expand': '展开侧边栏',
    'sidebar.collapse': '折叠侧边栏',
    'sidebar.open': '打开分类导航',
    'sidebar.home': 'SoMarkIt 首页',

    'footer.tagline': '每个好工具，都值得被标记',
    'footer.about': '关于',
    'footer.admin': '管理后台',
    'footer.contact': '联系我们',
    'footer.sitemap': '站点地图',
    'footer.terms': '条款',

    'detail.home': '首页',
    'detail.uncategorized': '未分类',
    'detail.visits': (n) => `${n} 次访问`,
    'detail.visitSite': '访问官网',
    'detail.related': '相关工具',
    'detail.notFound': '页面不存在',
    'detail.disclaimer': '免责声明：测评内容仅代表编辑个人观点和使用体验，不构成任何商业推荐或投资建议。产品信息和价格可能随时变动，请以官方最新信息为准。',
    'detail.infoCategory': '分类',
    'detail.infoPrice': '价格',
    'detail.infoTags': '标签',
    'detail.infoWebsite': '官网',
    'detail.reviewLabel': '评测正文',
    'detail.about': '简介',
    'detail.info': '核心信息',
    'detail.author': '作者：SoMarkIt 编辑部',
    'detail.authorName': 'SoMarkIt 编辑部',

    // Submit-tool form
    'submit.title': '提交工具',
    'submit.lead': '发现了好用的 AI 工具？告诉我们，审核通过后就会出现在站点上。',
    'submit.name': '工具名称',
    'submit.namePh': '例如：ChatGPT',
    'submit.url': '官网链接',
    'submit.urlPh': 'https://example.com',
    'submit.category': '所属分类',
    'submit.categoryPh': '请选择分类',
    'submit.pricing': '定价模式',
    'submit.tags': '标签',
    'submit.tagsPh': '对话, 写作（用逗号分隔）',
    'submit.description': '一句话简介',
    'submit.descriptionPh': '这个工具是做什么的、适合谁用',
    'submit.yourName': '你的称呼',
    'submit.yourNamePh': '选填',
    'submit.yourEmail': '联系邮箱',
    'submit.yourEmailPh': '选填',
    'submit.note': '补充说明',
    'submit.notePh': '选填：推荐理由、亮点功能等',
    'submit.submitBtn': '提交',
    'submit.required': '必填',
    'submit.successTitle': '提交成功',
    'submit.successBody': '感谢推荐！我们会尽快审核，收录后会出现在站点上。',
    'submit.again': '再提交一个',
    'submit.back': '返回首页',
    'submit.errName': '请填写工具名称',
    'submit.errUrl': '请填写正确的官网链接（需以 http:// 或 https:// 开头）',
    'submit.errCategory': '请选择分类',
    'submit.errRate': '提交过于频繁，请稍后再试',
    'submit.errGeneric': '提交失败，请稍后再试',
    'submit.privacy': '我们只会使用你提供的邮箱回复审核结果，不会用于其他用途。',

    'about.title': '关于 SoMarkIt — AI 工具导航',
    'about.h1': '关于 SoMarkIt',
    'about.p1': 'SoMarkIt 是一个由站长人工筛选 + 持续维护的 AI 工具导航站。我们不追求收录最多，而是希望每个被收录的工具都经过实际验证，并配上清楚的定位说明。',
    'about.p2': '站点运行在 Cloudflare Workers + D1 之上，内容通过自带的管理后台维护，收录与更新实时生效。',
    'about.h2What': '我们收录什么',
    'about.li1': '可公开访问、有明确价值的 AI 产品与服务',
    'about.li2': '覆盖对话、智能体、编程、办公、图像、视频、音频、设计、研究、行业、大模型、开发平台等门类',
    'about.li3': '每条记录包含定价模式、核心标签与一句话定位',
    'about.h2Submit': '收录提交',
    'about.submitNote': '如需提交或纠正收录信息，请通过站点管理后台联系站长。',

    'about.h2Who': '我们是谁',
    'about.h2Team': 'SoMarkIt 编辑部',
    'about.teamBio': '站点由站长与编辑团队共同维护：站长负责选品与最终审核，编辑负责实际试用、撰写与翻译。所有评测统一署名「SoMarkIt 编辑部」，不接受付费排名。',
    'about.h2How': '我们如何筛选与评测',
    'about.how1': '每个工具至少完成一次真实注册与核心流程试用，记录可用性、速度与限制。',
    'about.how2': '评测维度固定为：核心能力、中文表现、价格与免费额度、稳定性、数据与隐私。',
    'about.how3': '价格与功能变动会触发复查；无法验证或已下线的工具会被标注或移除。',
    'about.h2Fix': '更正与编辑独立性',
    'about.fixNote': '收录不收费，排序不售卖。发现信息错误可通过下方邮箱更正，我们会在核实后更新并标注日期。',
    'about.h2Contact': '联系与更新',
    'about.contactNote': '提交工具、纠正信息或合作咨询，请联系 support@somarkit.com。',

    'search.title': (q) => `搜索「${q}」`,
    'search.titleEmpty': '搜索工具',
    'search.heading': (q) => `搜索「${q}」`,
    'search.headingEmpty': '搜索工具',
    'search.count': (n) => `找到 ${n} 个工具`,
    'search.countNone': '没有找到匹配的工具',
    'search.hint': '输入工具名称、功能或标签开始搜索',
    'search.noResults': '没有找到匹配的工具',
    'search.noResultsHint': '试试更短的关键词，或者换个说法。',
    'search.viewAll': '查看全部结果',
    'search.prev': '上一页',
    'search.next': '下一页',
    'search.pagerAria': '搜索结果分页',
    'search.loading': '正在搜索…',
    'search.backHome': '返回首页',
    'search.description': (q, n) => `${q} 的搜索结果：${n} 个相关 AI 工具。`,
    'notFound.title': '页面不存在 | SoMarkIt',
    'notFound.h1': '页面走丢了',
    'notFound.body': '这个页面不存在，或者对应的工具已经下架。试试从下面的分类重新找找，或者回到首页。',
    'notFound.back': '返回首页',
    'notFound.browse': '浏览全部工具',
    'notFound.suggest': '或者看看这些分类',

    'seo.homeTitle': 'SoMarkIt — 精选 AI 工具导航 | 让每个好工具被标记',
    'seo.siteDesc':
      'SoMarkIt 是一站式 AI 工具导航平台，精选收录对话、智能体、编程、办公、图像、视频等 13 大类优质 AI 工具，持续更新、快速检索。',
    'seo.homeH1.1': 'AI 工具导航，',
    'seo.homeH1.2': '让每个好工具被看见',
    'seo.homeDesc':
      'SoMarkIt 精选 AI 对话、编程、绘画、视频、办公等 13 类工具，每条附定价、标签与一句话评测，支持按分类和价格筛选，持续更新。',
    'seo.keywords':
      'SoMarkIt,AI工具,AI导航,AI工具导航,AI对话,AI编程,AI绘画,AI视频,人工智能工具',
    'seo.categoryH1': (name) => `${name}工具推荐`,
    'seo.categoryFeatured': '本分类热门',
    'seo.relatedCategories': '相关分类',
    'seo.pageSuffix': (n) => `（第 ${n} 页）`,
    'seo.pageDescSuffix': (n) => `第 ${n} 页。`,
    'seo.categoryTitle': (name, year) => `${name}工具推荐（${year}）— 功能、价格与选型`,
    'seo.categoryIntro': (name) =>
      `精选值得尝试的${name}，覆盖日常使用、进阶工作流与团队协作场景。每个条目都附定价、核心标签与一句话定位；我们会持续补充新工具，并更新价格与可用性。`,
    'seo.categoryDesc': (name) =>
      `精选 ${name}，按定价、能力与适用场景对比，附官网直达与一句话评测，持续更新。`,
    'seo.toolH1': (name) => `${name} 评测`,
    'seo.toolTitle': (name, year) => `${name} 评测（${year}）：功能、价格与替代方案`,
    'seo.toolTitleShort': (name, year) => `${name} 评测（${year}）：功能与价格`,
    'seo.toolDescSuffix': '本文整理它的核心功能、定价、优缺点与替代方案。',
    'seo.aboutTitle': '关于 SoMarkIt — AI 工具导航的收录与评测标准',
    'seo.aboutDesc':
      '了解 SoMarkIt 的团队、AI 工具筛选与评测标准、收录流程、更新频率和联系方式，以及我们如何保持编辑独立性。',
    'seo.lastUpdated': (date) => `最后更新：${date}`,
    'seo.ogAlt': 'SoMarkIt — 精选 AI 工具导航',
  },

  en: {
    'nav.allTools': 'All tools',
    'nav.search': 'Search AI tools…',
    'nav.searchAria': 'Search AI tools',
    'nav.language': 'Language',
    'nav.theme': 'Toggle theme',
    'nav.categories': 'Categories',
    'nav.submit': 'Submit tool',

    'hero.title.1': 'Every great tool ',
    'hero.title.2': 'deserves a mark',
    'hero.subtitle': (n, c) => `${n} hand-picked AI tools across ${c} categories, curated for you.`,
    'hero.searchPlaceholder': 'Search by name, feature or tag…',
    'hero.searchPlaceholderShort': 'Search tools…',
    'hero.searchAria': 'Search the site',
    'hero.searchBtn': 'Search',
    'hero.statTools': 'Tools',
    'hero.statCategories': 'Categories',
    'hero.statUpdate': 'Updated',
    'hero.statUpdateValue': 'Weekly',
    'hero.featured': 'Trending AI tools',

    'content.title': 'All tools',
    'content.toolsCount': (n) => `${n} tools`,
    'content.filtered': (n) => `${n} tools matched`,
    'content.filterAria': 'Filter by pricing',
    'content.viewAll': 'View all',

    'pricing.all': 'All',
    'pricing.free': 'Free',
    'pricing.freemium': 'Freemium',
    'pricing.paid': 'Paid',
    'pricing.opensource': 'Open source',

    'card.review': 'Review',
    'card.opening': 'Opening…',
    'card.visit': 'Visit',
    'card.noDesc': 'No description yet',

    'badge.hot': '🔥 Hot',
    'badge.new': '✦ New',

    'empty.title': 'No tools matched',
    'empty.hint': 'Try another keyword, or ',
    'empty.clear': 'clear all filters',

    'sidebar.expand': 'Expand sidebar',
    'sidebar.collapse': 'Collapse sidebar',
    'sidebar.open': 'Open category navigation',
    'sidebar.home': 'SoMarkIt home',

    'footer.tagline': 'Every great tool deserves a mark',
    'footer.about': 'About',
    'footer.admin': 'Admin',
    'footer.contact': 'Contact',
    'footer.sitemap': 'Sitemap',
    'footer.terms': 'Terms',

    'detail.home': 'Home',
    'detail.uncategorized': 'Uncategorized',
    'detail.visits': (n) => `${n} visits`,
    'detail.visitSite': 'Visit website',
    'detail.related': 'Related tools',
    'detail.notFound': 'Page not found',
    'detail.disclaimer': "Disclaimer: Review content represents our editorial team's views and experience, not commercial recommendation or investment advice. Product info and pricing may change; refer to official sources.",
    'detail.infoCategory': 'Category',
    'detail.infoPrice': 'Pricing',
    'detail.infoTags': 'Tags',
    'detail.infoWebsite': 'Website',
    'detail.reviewLabel': 'Review',
    'detail.about': 'Overview',
    'detail.info': 'Key facts',
    'detail.author': 'By the SoMarkIt editorial team',
    'detail.authorName': 'SoMarkIt Editorial Team',

    // Submit-tool form
    'submit.title': 'Submit a tool',
    'submit.lead': 'Found a great AI tool? Tell us about it — once approved it goes live on the site.',
    'submit.name': 'Tool name',
    'submit.namePh': 'e.g. ChatGPT',
    'submit.url': 'Website URL',
    'submit.urlPh': 'https://example.com',
    'submit.category': 'Category',
    'submit.categoryPh': 'Choose a category',
    'submit.pricing': 'Pricing',
    'submit.tags': 'Tags',
    'submit.tagsPh': 'chat, writing (comma separated)',
    'submit.description': 'One-line summary',
    'submit.descriptionPh': 'What it does and who it is for',
    'submit.yourName': 'Your name',
    'submit.yourNamePh': 'Optional',
    'submit.yourEmail': 'Contact email',
    'submit.yourEmailPh': 'Optional',
    'submit.note': 'Anything else',
    'submit.notePh': 'Optional: why we should list it, standout features…',
    'submit.submitBtn': 'Submit',
    'submit.required': 'required',
    'submit.successTitle': 'Submitted',
    'submit.successBody': 'Thanks! We will review it shortly and publish it once approved.',
    'submit.again': 'Submit another',
    'submit.back': 'Back to home',
    'submit.errName': 'Please enter the tool name',
    'submit.errUrl': 'Please enter a valid website URL (starting with http:// or https://)',
    'submit.errCategory': 'Please choose a category',
    'submit.errRate': 'Too many submissions — please try again later',
    'submit.errGeneric': 'Submission failed, please try again later',
    'submit.privacy': 'We only use your email to reply about this submission.',

    'about.title': 'About SoMarkIt — AI Tool Directory',
    'about.h1': 'About SoMarkIt',
    'about.p1': "SoMarkIt is a hand-curated AI tool directory. We do not aim to list the most tools — every entry is checked in practice and comes with a clear positioning note.",
    'about.p2': 'The site runs on Cloudflare Workers + D1, and content is maintained through a built-in admin console with instant publishing.',
    'about.h2What': 'What we list',
    'about.li1': 'Publicly accessible AI products and services with clear value',
    'about.li2': 'Chat assistants, agents, coding, productivity, image, video, audio, design, research, models and platforms',
    'about.li3': 'Each record includes pricing model, core tags and a one-line positioning',
    'about.h2Submit': 'Submissions',
    'about.submitNote': 'To submit or correct an entry, please contact the site owner through the admin console.',

    'about.h2Who': 'Who we are',
    'about.h2Team': 'SoMarkIt Editorial',
    'about.teamBio': 'The site is run by the founder and an editorial team: the founder owns selection and final review, while editors test tools, write and translate. Reviews are bylined “SoMarkIt Editorial” and rankings are never paid.',
    'about.h2How': 'How we review',
    'about.how1': 'Every tool gets a real sign-up and a run through its core flow, noting availability, speed and limits.',
    'about.how2': 'We score the same dimensions: core capability, language performance, pricing and free tier, reliability, and data/privacy.',
    'about.how3': 'Pricing or feature changes trigger a re-check; tools we cannot verify or that go offline are flagged or removed.',
    'about.h2Fix': 'Corrections and independence',
    'about.fixNote': 'Listing is free and ranking is not for sale. Email us to correct an entry; we verify and update it with a date.',
    'about.h2Contact': 'Contact and updates',
    'about.contactNote': 'To submit a tool, correct an entry or ask about partnerships, email support@somarkit.com.',

    'search.title': (q) => `Search “${q}”`,
    'search.titleEmpty': 'Search tools',
    'search.heading': (q) => `Search “${q}”`,
    'search.headingEmpty': 'Search tools',
    'search.count': (n) => `${n} tool${n === 1 ? '' : 's'} found`,
    'search.countNone': 'No matching tools',
    'search.hint': 'Start typing a tool name, feature or tag',
    'search.noResults': 'No matching tools',
    'search.noResultsHint': 'Try a shorter keyword, or a different phrasing.',
    'search.viewAll': 'View all results',
    'search.prev': 'Previous',
    'search.next': 'Next',
    'search.pagerAria': 'Search result pages',
    'search.loading': 'Searching…',
    'search.backHome': 'Back to home',
    'search.description': (q, n) => `Search results for ${q}: ${n} matching AI tools.`,
    'notFound.title': 'Page not found | SoMarkIt',
    'notFound.h1': 'This page took a wrong turn',
    'notFound.body': 'The page does not exist, or the tool has been taken offline. Try one of the categories below, or head back home.',
    'notFound.back': 'Back to home',
    'notFound.browse': 'Browse all tools',
    'notFound.suggest': 'Or start from a category',

    'seo.homeTitle': 'SoMarkIt — Curated AI Tool Directory',
    'seo.siteDesc':
      'SoMarkIt is a curated directory of AI tools covering chat assistants, agents, coding, productivity, image, video and 13 categories in total.',
    'seo.homeH1.1': 'AI tools directory,',
    'seo.homeH1.2': 'curated for discovery',
    'seo.homeDesc':
      'SoMarkIt curates AI tools across chat, coding, image, video and productivity, with pricing, tags and a one-line review for each. Browse by category or price.',
    'seo.keywords':
      'SoMarkIt,AI tools,AI tools directory,AI directory,ChatGPT,Claude,AI writing,AI image,AI video',
    'seo.categoryH1': (name) => `${name}: Reviews & Alternatives`,
    'seo.categoryFeatured': 'Top picks in this category',
    'seo.relatedCategories': 'Related categories',
    'seo.pageSuffix': (n) => ` (Page ${n})`,
    'seo.pageDescSuffix': (n) => `Page ${n}.`,
    'seo.categoryTitle': (name, year) => `${name} (${year}): Reviews, Pricing & Alternatives`,
    'seo.categoryIntro': (name) =>
      `A curated selection of ${name} for everyday use, advanced workflows and team collaboration. Every entry includes pricing, core tags and a one-line summary, and we keep adding new tools while updating pricing and availability.`,
    'seo.categoryDesc': (name) =>
      `A curated list of ${name}, compared by pricing, capability and use case, with direct links and a one-line review.`,
    'seo.toolH1': (name) => `${name} Review`,
    'seo.toolTitle': (name, year) => `${name} Review (${year}): Features, Pricing & Alternatives`,
    'seo.toolTitleShort': (name, year) => `${name} Review (${year}): Features & Pricing`,
    'seo.toolDescSuffix': 'This review covers its key features, pricing, pros and cons, and alternatives.',
    'seo.aboutTitle': 'About SoMarkIt — How We Curate and Review AI Tools',
    'seo.aboutDesc':
      'Meet the team behind SoMarkIt, our AI tool selection and review criteria, submission process, update cadence and how we stay editorially independent.',
    'seo.lastUpdated': (date) => `Last updated: ${date}`,
    'seo.ogAlt': 'SoMarkIt — Curated AI Tools Directory',
  },

  ja: {
    'nav.allTools': 'すべてのツール',
    'nav.search': 'AI ツールを検索…',
    'nav.searchAria': 'AI ツールを検索',
    'nav.language': '言語を切り替え',
    'nav.theme': 'テーマを切り替え',
    'nav.categories': 'カテゴリー',
    'nav.submit': 'ツールを投稿',

    'hero.title.1': '優れたツールは、',
    'hero.title.2': '見つけられるべき',
    'hero.subtitle': (n, c) => `${n} 個の AI ツールを ${c} 個のカテゴリーに整理しました。`,
    'hero.searchPlaceholder': 'ツール名・機能・タグで検索…',
    'hero.searchPlaceholderShort': 'ツールを検索…',
    'hero.searchAria': 'サイト内検索',
    'hero.searchBtn': '検索',
    'hero.statTools': '収録ツール',
    'hero.statCategories': 'カテゴリー',
    'hero.statUpdate': '更新頻度',
    'hero.statUpdateValue': '毎週',
    'hero.featured': '今旬の AI ツール',

    'content.title': 'ツール一覧',
    'content.toolsCount': (n) => `全 ${n} 件のツール`,
    'content.filtered': (n) => `${n} 件が一致`,
    'content.filterAria': '料金で絞り込む',
    'content.viewAll': 'すべて見る',

    'pricing.all': 'すべて',
    'pricing.free': '無料',
    'pricing.freemium': 'フリーミアム',
    'pricing.paid': '有料',
    'pricing.opensource': 'オープンソース',

    'card.review': 'レビュー',
    'card.opening': '移動中…',
    'card.visit': '開く',
    'card.noDesc': '説明はまだありません',

    'badge.hot': '🔥 人気',
    'badge.new': '✦ 新着',

    'empty.title': '一致するツールが見つかりません',
    'empty.hint': '別のキーワードをお試しいただくか、',
    'empty.clear': '絞り込みを解除',

    'sidebar.expand': 'サイドバーを開く',
    'sidebar.collapse': 'サイドバーを閉じる',
    'sidebar.open': 'カテゴリーナビを開く',
    'sidebar.home': 'SoMarkIt ホーム',

    'footer.tagline': '優れたツールは、見つけられるべき',
    'footer.about': 'このサイトについて',
    'footer.admin': '管理画面',
    'footer.contact': 'お問い合わせ',
    'footer.sitemap': 'サイトマップ',
    'footer.terms': '利用規約',

    'detail.home': 'ホーム',
    'detail.uncategorized': '未分類',
    'detail.visits': (n) => `${n} 回のアクセス`,
    'detail.visitSite': '公式サイトへ',
    'detail.related': '関連ツール',
    'detail.notFound': 'ページが見つかりません',
    'detail.disclaimer': '免責事項：レビュー内容は編集部個人の見解と利用経験であり、商業的な推薦や投資助言ではありません。製品情報や料金は予告なく変更される場合があります。最新の情報は公式サイトをご確認ください。',
    'detail.infoCategory': 'カテゴリー',
    'detail.infoPrice': '料金',
    'detail.infoTags': 'タグ',
    'detail.infoWebsite': '公式サイト',
    'detail.reviewLabel': 'レビュー本文',
    'detail.about': '概要',
    'detail.info': '基本情報',
    'detail.author': '著者：SoMarkIt 編集部',
    'detail.authorName': 'SoMarkIt 編集部',

    // Submit-tool form
    'submit.title': 'ツールを投稿',
    'submit.lead': '便利な AI ツールを見つけましたか？ぜひ教えてください。審査後にサイトへ掲載します。',
    'submit.name': 'ツール名',
    'submit.namePh': '例：ChatGPT',
    'submit.url': '公式サイトの URL',
    'submit.urlPh': 'https://example.com',
    'submit.category': 'カテゴリー',
    'submit.categoryPh': 'カテゴリーを選択',
    'submit.pricing': '料金モデル',
    'submit.tags': 'タグ',
    'submit.tagsPh': '対話, 執筆（カンマ区切り）',
    'submit.description': 'ひとこと紹介',
    'submit.descriptionPh': '何ができて、誰に向いているか',
    'submit.yourName': 'お名前',
    'submit.yourNamePh': '任意',
    'submit.yourEmail': '連絡先メール',
    'submit.yourEmailPh': '任意',
    'submit.note': '補足',
    'submit.notePh': '任意：おすすめの理由や注目ポイントなど',
    'submit.submitBtn': '投稿する',
    'submit.required': '必須',
    'submit.successTitle': '投稿を受け付けました',
    'submit.successBody': 'ありがとうございます。審査のうえ、掲載が承認されるとサイトに表示されます。',
    'submit.again': '続けて投稿する',
    'submit.back': 'ホームへ戻る',
    'submit.errName': 'ツール名を入力してください',
    'submit.errUrl': '正しい URL を入力してください（http:// または https:// で始まる）',
    'submit.errCategory': 'カテゴリーを選択してください',
    'submit.errRate': '投稿が多すぎます。しばらくしてからもう一度お試しください',
    'submit.errGeneric': '投稿に失敗しました。しばらくしてからもう一度お試しください',
    'submit.privacy': 'ご記入いただいたメールアドレスは、この投稿に関する連絡にのみ使用します。',

    'about.title': 'SoMarkIt について — AI ツールディレクトリ',
    'about.h1': 'SoMarkIt について',
    'about.p1': 'SoMarkIt は運営者が人の手で厳選し、継続的に更新している AI ツールディレクトリです。数多くのツールを集めることより、実際に試して確認したツールだけを、わかりやすい位置づけとともに紹介することを大切にしています。',
    'about.p2': 'サイトは Cloudflare Workers + D1 上で動作し、内容は管理画面から管理しています。収録・更新の反映は即時です。',
    'about.h2What': '収録の基準',
    'about.li1': '一般に公開されており、明確な価値のある AI 製品・サービス',
    'about.li2': '対話、エージェント、コーディング、業務効率化、画像、動画、音声、デザイン、リサーチ、モデル、開発プラットフォームなど',
    'about.li3': '各レコードには料金モデル・主要タグ・ひとことでの位置づけを含みます',
    'about.h2Submit': '掲載のご依頼',
    'about.submitNote': '掲載のご依頼や情報の訂正は、管理画面から運営者までご連絡ください。',

    'about.h2Who': '運営について',
    'about.h2Team': 'SoMarkIt 編集部',
    'about.teamBio': 'サイトは運営者と編集チームで運営しています。運営者が選定と最終確認を、編集が実際の試用・執筆・翻訳を担当します。レビューはすべて「SoMarkIt 編集部」名義で、有料の順位掲載は行いません。',
    'about.h2How': '選定と評価の方法',
    'about.how1': 'すべてのツールは実際に登録し、主要機能を一通り試して、可用性・速度・制限を記録します。',
    'about.how2': '評価軸は「主要機能」「日本語/中文の性能」「料金と無料枠」「安定性」「データとプライバシー」で統一しています。',
    'about.how3': '料金や機能の変更があれば再確認し、検証できないもの・終了したものは注記または削除します。',
    'about.h2Fix': '訂正と編集の独立性',
    'about.fixNote': '掲載は無料で、順位の販売は行いません。誤りはメールでご連絡ください。確認のうえ日付を付して更新します。',
    'about.h2Contact': 'お問い合わせと更新',
    'about.contactNote': '掲載依頼・情報の訂正・提携のご相談は support@somarkit.com まで。',

    'search.title': (q) => `「${q}」の検索`,
    'search.titleEmpty': 'ツールを検索',
    'search.heading': (q) => `「${q}」の検索`,
    'search.headingEmpty': 'ツールを検索',
    'search.count': (n) => `${n} 件見つかりました`,
    'search.countNone': '一致するツールがありません',
    'search.hint': 'ツール名・機能・タグを入力してください',
    'search.noResults': '一致するツールがありません',
    'search.noResultsHint': 'より短いキーワードか、別の言い方を試してください。',
    'search.viewAll': 'すべての結果を見る',
    'search.prev': '前へ',
    'search.next': '次へ',
    'search.pagerAria': '検索結果のページ送り',
    'search.loading': '検索中…',
    'search.backHome': 'ホームへ戻る',
    'search.description': (q, n) => `${q} の検索結果：${n} 件の AI ツール。`,
    'notFound.title': 'ページが見つかりません | SoMarkIt',
    'notFound.h1': 'ページが見つかりません',
    'notFound.body': 'ページが存在しないか、ツールが非公開になっています。下のカテゴリから探すか、ホームへお戻りください。',
    'notFound.back': 'ホームへ戻る',
    'notFound.browse': 'すべてのツールを見る',
    'notFound.suggest': 'カテゴリから探す',

    'seo.homeTitle': 'SoMarkIt — 厳選された AI ツールディレクトリ',
    'seo.siteDesc':
      'SoMarkIt は AI ツールを厳選して紹介するディレクトリです。対話アシスタント、エージェント、コーディング、業務効率化、画像、動画など計 13 カテゴリーを収録しています。',
    'seo.homeH1.1': 'AI ツールディレクトリ、',
    'seo.homeH1.2': '良いツールを見つけよう',
    'seo.homeDesc':
      'SoMarkIt は、対話・コーディング・画像・動画・業務効率化などの AI ツールを厳選し、料金・タグ・ひとことレビュー付きで紹介しています。カテゴリーや料金で絞り込めます。',
    'seo.keywords':
      'SoMarkIt,AIツール,AIツールディレクトリ,AI ディレクトリ,ChatGPT,Claude,AI 画像,AI 動画',
    'seo.categoryH1': (name) => `${name}おすすめツール`,
    'seo.categoryFeatured': 'このカテゴリの人気',
    'seo.relatedCategories': '関連カテゴリ',
    'seo.pageSuffix': (n) => `（${n} ページ目）`,
    'seo.pageDescSuffix': (n) => `${n} ページ目。`,
    'seo.categoryTitle': (name, year) => `${name}おすすめツール（${year}）`,
    'seo.categoryIntro': (name) =>
      `日常利用から上級ワークフロー、チーム活用まで、${name}を厳選して紹介します。各項目には料金・主要タグ・ひとことでの位置づけを記載し、新しいツールの追加と価格・提供状況の更新を続けています。`,
    'seo.categoryDesc': (name) =>
      `${name}を料金・機能・用途別に比較して厳選。公式サイトへの直リンクとひとことレビュー付きで、継続的に更新しています。`,
    'seo.toolH1': (name) => `${name} レビュー`,
    'seo.toolTitle': (name, year) => `${name} レビュー（${year}）：機能・料金`,
    'seo.toolTitleShort': (name, year) => `${name} レビュー（${year}）`,
    'seo.toolDescSuffix': '機能・料金・メリット・デメリット・代替ツールをまとめました。',
    'seo.aboutTitle': 'SoMarkIt について — AI ツールの選定と評価基準',
    'seo.aboutDesc':
      'SoMarkIt の運営体制、AI ツールの選定・評価基準、掲載の流れ、更新頻度、編集の独立性について説明します。',
    'seo.lastUpdated': (date) => `最終更新：${date}`,
    'seo.ogAlt': 'SoMarkIt — 厳選 AI ツールディレクトリ',
  },

  ko: {
    'nav.allTools': '전체 도구',
    'nav.search': 'AI 도구 검색…',
    'nav.searchAria': 'AI 도구 검색',
    'nav.language': '언어 전환',
    'nav.theme': '테마 전환',
    'nav.categories': '카테고리',
    'nav.submit': '도구 제안',

    'hero.title.1': '좋은 도구는,',
    'hero.title.2': '발견되어야 하니까',
    'hero.subtitle': (n, c) => `${n}개의 AI 도구를 ${c}개 카테고리로 정리했습니다.`,
    'hero.searchPlaceholder': '도구 이름, 기능, 태그로 검색…',
    'hero.searchPlaceholderShort': '도구 검색…',
    'hero.searchAria': '사이트 검색',
    'hero.searchBtn': '검색',
    'hero.statTools': '수록 도구',
    'hero.statCategories': '카테고리',
    'hero.statUpdate': '업데이트',
    'hero.statUpdateValue': '매주',
    'hero.featured': '요즘 인기 있는 AI 도구',

    'content.title': '도구 목록',
    'content.toolsCount': (n) => `총 ${n}개 도구`,
    'content.filtered': (n) => `${n}개 도구가 일치`,
    'content.filterAria': '가격으로 필터링',
    'content.viewAll': '전체 보기',

    'pricing.all': '전체',
    'pricing.free': '무료',
    'pricing.freemium': '부분 무료',
    'pricing.paid': '유료',
    'pricing.opensource': '오픈소스',

    'card.review': '리뷰',
    'card.opening': '이동 중…',
    'card.visit': '열기',
    'card.noDesc': '아직 설명이 없습니다',

    'badge.hot': '🔥 인기',
    'badge.new': '✦ 신규',

    'empty.title': '일치하는 도구가 없습니다',
    'empty.hint': '다른 키워드로 검색해 보시거나, ',
    'empty.clear': '필터 해제',

    'sidebar.expand': '사이드바 펼치기',
    'sidebar.collapse': '사이드바 접기',
    'sidebar.open': '카테고리 메뉴 열기',
    'sidebar.home': 'SoMarkIt 홈',

    'footer.tagline': '좋은 도구는 발견되어야 하니까',
    'footer.about': '소개',
    'footer.admin': '관리자',
    'footer.contact': '문의하기',
    'footer.sitemap': '사이트맵',
    'footer.terms': '약관',

    'detail.home': '홈',
    'detail.uncategorized': '미분류',
    'detail.visits': (n) => `방문 ${n}회`,
    'detail.visitSite': '공식 사이트 방문',
    'detail.related': '관련 도구',
    'detail.notFound': '페이지를 찾을 수 없습니다',
    'detail.disclaimer': '면책 조항: 리뷰 내용은 편집자의 개인적인 견해와 사용 경험을 담은 것으로, 상업적 추천이나 투자 조언이 아닙니다. 제품 정보와 가격은 사전 예고 없이 변경될 수 있으므로 공식 사이트의 최신 정보를 확인해 주세요.',
    'detail.infoCategory': '카테고리',
    'detail.infoPrice': '가격',
    'detail.infoTags': '태그',
    'detail.infoWebsite': '웹사이트',
    'detail.reviewLabel': '리뷰 본문',
    'detail.about': '소개',
    'detail.info': '기본 정보',
    'detail.author': '작성: SoMarkIt 편집부',
    'detail.authorName': 'SoMarkIt 편집부',

    // Submit-tool form
    'submit.title': '도구 제안하기',
    'submit.lead': '좋은 AI 도구를 찾으셨나요? 알려 주시면 검토 후 사이트에 소개해 드립니다.',
    'submit.name': '도구 이름',
    'submit.namePh': '예: ChatGPT',
    'submit.url': '공식 사이트 주소',
    'submit.urlPh': 'https://example.com',
    'submit.category': '카테고리',
    'submit.categoryPh': '카테고리 선택',
    'submit.pricing': '요금제',
    'submit.tags': '태그',
    'submit.tagsPh': '대화, 글쓰기 (쉼표로 구분)',
    'submit.description': '한 줄 소개',
    'submit.descriptionPh': '무엇을 하는 도구이고 누구에게 맞는지',
    'submit.yourName': '이름',
    'submit.yourNamePh': '선택 사항',
    'submit.yourEmail': '연락 이메일',
    'submit.yourEmailPh': '선택 사항',
    'submit.note': '추가 설명',
    'submit.notePh': '선택 사항: 추천 이유, 주요 기능 등',
    'submit.submitBtn': '제안하기',
    'submit.required': '필수',
    'submit.successTitle': '제출 완료',
    'submit.successBody': '감사합니다! 검토 후 승인되면 사이트에 소개됩니다.',
    'submit.again': '하나 더 제안하기',
    'submit.back': '홈으로 돌아가기',
    'submit.errName': '도구 이름을 입력해 주세요',
    'submit.errUrl': '올바른 주소를 입력해 주세요 (http:// 또는 https:// 로 시작)',
    'submit.errCategory': '카테고리를 선택해 주세요',
    'submit.errRate': '제출이 너무 많습니다. 잠시 후 다시 시도해 주세요',
    'submit.errGeneric': '제출에 실패했습니다. 잠시 후 다시 시도해 주세요',
    'submit.privacy': '입력하신 이메일은 이 제출 건에 대한 답변에만 사용됩니다.',

    'about.title': 'SoMarkIt 소개 — AI 도구 디렉터리',
    'about.h1': 'SoMarkIt 소개',
    'about.p1': 'SoMarkIt은 운영자가 직접 선별하고 꾸준히 관리하는 AI 도구 디렉터리입니다. 가장 많은 도구를 모으기보다, 실제로 사용해 검증한 도구를 명확한 소개와 함께 보여 주는 것을 목표로 합니다.',
    'about.p2': '사이트는 Cloudflare Workers + D1 위에서 동작하며, 콘텐츠는 관리자 콘솔에서 관리됩니다. 수정 사항은 즉시 반영됩니다.',
    'about.h2What': '수록 기준',
    'about.li1': '누구나 이용할 수 있고 명확한 가치가 있는 AI 제품과 서비스',
    'about.li2': '대화, 에이전트, 코딩, 생산성, 이미지, 영상, 오디오, 디자인, 리서치, 모델, 개발 플랫폼 등',
    'about.li3': '각 항목에는 요금제, 핵심 태그, 한 줄 소개가 포함됩니다',
    'about.h2Submit': '제보 및 제안',
    'about.submitNote': '도구 제안이나 정보 수정은 관리자 콘솔을 통해 운영자에게 알려 주세요.',

    'about.h2Who': '운영진 소개',
    'about.h2Team': 'SoMarkIt 편집부',
    'about.teamBio': '사이트는 운영자와 편집팀이 함께 관리합니다. 운영자는 선정과 최종 검수를, 편집팀은 실제 사용·집필·번역을 담당합니다. 모든 리뷰는 “SoMarkIt 편집부” 이름으로 게재하며 유료 순위는 받지 않습니다.',
    'about.h2How': '선정과 평가 방법',
    'about.how1': '모든 도구는 직접 가입해 핵심 기능을 사용해 보고, 가용성·속도·제한을 기록합니다.',
    'about.how2': '평가 기준은 핵심 기능, 언어 성능, 가격과 무료 한도, 안정성, 데이터·개인정보로 통일합니다.',
    'about.how3': '가격이나 기능이 바뀌면 다시 확인하며, 검증할 수 없거나 종료된 도구는 표시하거나 삭제합니다.',
    'about.h2Fix': '정정과 편집 독립성',
    'about.fixNote': '등재는 무료이며 순위를 판매하지 않습니다. 오류는 이메일로 알려 주시면 확인 후 날짜와 함께 수정합니다.',
    'about.h2Contact': '문의와 업데이트',
    'about.contactNote': '도구 제안, 정보 수정, 제휴 문의는 support@somarkit.com으로 보내 주세요.',

    'search.title': (q) => `"${q}" 검색`,
    'search.titleEmpty': '도구 검색',
    'search.heading': (q) => `"${q}" 검색`,
    'search.headingEmpty': '도구 검색',
    'search.count': (n) => `${n}개를 찾았습니다`,
    'search.countNone': '일치하는 도구가 없습니다',
    'search.hint': '도구 이름, 기능, 태그를 입력하세요',
    'search.noResults': '일치하는 도구가 없습니다',
    'search.noResultsHint': '더 짧은 키워드나 다른 표현을 시도해 보세요.',
    'search.viewAll': '전체 결과 보기',
    'search.prev': '이전',
    'search.next': '다음',
    'search.pagerAria': '검색 결과 페이지 이동',
    'search.loading': '검색 중…',
    'search.backHome': '홈으로 돌아가기',
    'search.description': (q, n) => `${q} 검색 결과: 관련 AI 도구 ${n}개.`,
    'notFound.title': '페이지를 찾을 수 없습니다 | SoMarkIt',
    'notFound.h1': '페이지를 찾을 수 없습니다',
    'notFound.body': '페이지가 존재하지 않거나 도구가 비공개로 전환되었습니다. 아래 카테고리에서 다시 찾아보시거나 홈으로 돌아가세요.',
    'notFound.back': '홈으로 돌아가기',
    'notFound.browse': '모든 도구 보기',
    'notFound.suggest': '카테고리에서 찾아보기',

    'seo.homeTitle': 'SoMarkIt — 엄선한 AI 도구 디렉터리',
    'seo.siteDesc':
      'SoMarkIt은 AI 도구를 엄선해 소개하는 디렉터리입니다. 대화 어시스턴트, 에이전트, 코딩, 생산성, 이미지, 영상 등 총 13개 카테고리를 수록하고 있습니다.',
    'seo.homeH1.1': 'AI 도구 디렉터리,',
    'seo.homeH1.2': '좋은 도구를 발견하세요',
    'seo.homeDesc':
      'SoMarkIt은 대화, 코딩, 이미지, 영상, 생산성 등 AI 도구를 엄선해 가격, 태그, 한 줄 리뷰와 함께 소개합니다. 카테고리나 가격으로 찾아볼 수 있습니다.',
    'seo.keywords':
      'SoMarkIt,AI 도구,AI 도구 디렉터리,AI 디렉터리,ChatGPT,Claude,AI 이미지,AI 영상',
    'seo.categoryH1': (name) => `${name} 추천 도구`,
    'seo.categoryFeatured': '이 카테고리 인기',
    'seo.relatedCategories': '관련 카테고리',
    'seo.pageSuffix': (n) => ` (${n} 페이지)`,
    'seo.pageDescSuffix': (n) => `${n} 페이지.`,
    'seo.categoryTitle': (name, year) => `${name} 추천 도구 (${year}): 기능, 가격, 선택 기준`,
    'seo.categoryIntro': (name) =>
      `일상 사용부터 고급 워크플로, 팀 협업까지 ${name} 목록을 엄선해 소개합니다. 각 항목에는 가격, 핵심 태그, 한 줄 소개를 담고 있으며 새 도구를 계속 추가하고 가격과 이용 가능 여부를 업데이트합니다.`,
    'seo.categoryDesc': (name) =>
      `${name} 목록을 가격, 기능, 사용 사례별로 비교해 엄선했습니다. 공식 사이트 바로가기와 한 줄 리뷰를 함께 제공하며 계속 업데이트합니다.`,
    'seo.toolH1': (name) => `${name} 리뷰`,
    'seo.toolTitle': (name, year) => `${name} 리뷰 (${year}): 기능, 가격, 대안`,
    'seo.toolTitleShort': (name, year) => `${name} 리뷰 (${year})`,
    'seo.toolDescSuffix': '핵심 기능, 가격, 장단점, 대안을 정리했습니다.',
    'seo.aboutTitle': 'SoMarkIt 소개 — AI 도구 선정과 평가 기준',
    'seo.aboutDesc':
      'SoMarkIt 운영진, AI 도구 선정·평가 기준, 등재 절차, 업데이트 주기, 편집 독립성에 대해 안내합니다.',
    'seo.lastUpdated': (date) => `최종 업데이트: ${date}`,
    'seo.ogAlt': 'SoMarkIt — 엄선한 AI 도구 디렉터리',
  },
};

/** Translate a key for the given language, with optional formatter args. */
export function t(lang, key, ...args) {
  const table = DICT[normalizeLang(lang)] || DICT[DEFAULT_LANG];
  const v = table[key];
  if (v == null) return DICT[DEFAULT_LANG][key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

/** Localised names of pricing modes (falls back to the raw key). */
export function pricingLabel(lang, pricing) {
  return t(lang, `pricing.${pricing}`) || pricing;
}
