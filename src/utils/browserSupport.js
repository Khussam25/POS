/** Detect browsers that cannot run the app (ES modules, Firebase, React 19). */

const MSGS = {
  en: {
    title: 'Browser not supported',
    body: 'JEIBE POS needs a modern browser. This one is too old or is missing required features.',
    hint: 'Install or open the latest Google Chrome, Microsoft Edge, or Firefox, then try again.',
    ie: 'Internet Explorer is not supported. Please use Microsoft Edge or Google Chrome.',
  },
  sw: {
    title: 'Kivinjari hakitumiki',
    body: 'JEIBE POS inahitaji kivinjari cha kisasa. Hiki ni cha zamani au hakina vipengele vinavyohitajika.',
    hint: 'Sakinisha au fungua Chrome, Edge, au Firefox ya hivi karibuni, kisha jaribu tena.',
    ie: 'Internet Explorer haitumiki. Tumia Microsoft Edge au Google Chrome.',
  },
}

export function getBrowserSupportIssue() {
  if (typeof window === 'undefined') return null

  const ua = navigator.userAgent || ''
  if (/MSIE |Trident\//i.test(ua)) return 'ie'

  if (typeof Promise === 'undefined') return 'old'
  if (typeof fetch === 'undefined') return 'old'
  if (typeof Symbol === 'undefined') return 'old'
  if (!('noModule' in document.createElement('script'))) return 'old'

  return null
}

export function getBrowserUnsupportedCopy(issue) {
  const lang = (typeof localStorage !== 'undefined' && localStorage.getItem('jeibe_lang') === 'sw') ? 'sw' : 'en'
  const m = MSGS[lang]
  return {
    title: m.title,
    body: issue === 'ie' ? m.ie : m.body,
    hint: m.hint,
  }
}
