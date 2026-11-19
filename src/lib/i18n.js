// -----------------------------------------------------------------------------
// i18n — UI string dictionaries.
// Content (tool names, descriptions, category names) is administrator-authored
// and published as-is; only the interface chrome is translated.
// -----------------------------------------------------------------------------

export const LANGS = [
  { code: 'zh', label: '中文', short: '中' },
  { code: 'en', label: 'English', short: 'EN' },
];

export const DEFAULT_LANG = 'zh';

export function normalizeLang(v) {
  return LANGS.some((l) => l.code === v) ? v : DEFAULT_LANG;
}

// -----------------------------------------------------------------------------
// Locale-prefixed routing.
//
// Every public page lives under a language prefix: `/zh/...` or `/en/...`.
// The language is decided by the URL alone — no cookie, no Accept-Language
// sniffing — so a shared link always renders in one language and crawlers get
// exactly what users get.
// -----------------------------------------------------------------------------

const LOCALE_PREFIX = /^\/(zh|en)(?=\/|$)/;

/**
 * Split a pathname into its language and the language-neutral remainder.
 *
 *   '/zh'            → { lang: 'zh', rest: '/',  matched: true  }
 *   '/en/tools/x'    → { lang: 'en', rest: '/tools/x', matched: true }
 *   '/tools/x'       → { lang: null, rest: '/tools/x', matched: false }
 *
 * Callers treat `matched: false` on public routes as a 404: unprefixed URLs are
 * intentionally unsupported so there is exactly one canonical address per page.
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
    'content.total': (n) => `共 ${n} 个`,
    'content.matched': (n, t) => `匹配 ${n} / ${t} 个`,

    'pricing.all': '全部',
    'pricing.free': '免费',
    'pricing.freemium': '免费增值',
    'pricing.paid': '付费',
    'pricing.opensource': '开源',

    'card.review': '评测',
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

    'seo.homeTitle': 'SoMarkIt — 精选 AI 工具导航 | 让每个好工具被标记',
    'seo.siteDesc':
      'SoMarkIt 是一站式 AI 工具导航平台，精选收录对话、智能体、编程、办公、图像、视频等 13 大类优质 AI 工具，持续更新、快速检索。',
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
    'content.total': (n) => `${n} total`,
    'content.matched': (n, t) => `${n} of ${t}`,

    'pricing.all': 'All',
    'pricing.free': 'Free',
    'pricing.freemium': 'Freemium',
    'pricing.paid': 'Paid',
    'pricing.opensource': 'Open source',

    'card.review': 'Review',
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

    'seo.homeTitle': 'SoMarkIt — Curated AI Tool Directory',
    'seo.siteDesc':
      'SoMarkIt is a curated directory of AI tools covering chat assistants, agents, coding, productivity, image, video and 13 categories in total.',
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
