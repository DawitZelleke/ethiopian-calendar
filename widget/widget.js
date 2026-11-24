/*
 * Ethiopian Orthodox calendar widget.
 *
 * Paste into any page (for example a WordPress "Custom HTML" block):
 *
 *   <div class="ethiopian-calendar" data-view="month"></div>
 *   <script src="https://dawitzelleke.github.io/ethiopian-calendar/widget.js" defer></script>
 *
 * Options (data- attributes on the div):
 *   data-view    "month" (a month grid, default) or "today" (a one-line banner)
 *   data-lang    "both" (Amharic and English, default), "am" or "en"
 *   data-accent  a CSS colour for highlights, e.g. "#8a1c1c"
 *   data-parish  a parish id (e.g. "st-teklehaimanot-ottawa") to add that parish's own days,
 *                such as its tabot processions, and to subscribe to that parish's feed
 *
 * The widget reads static files (data/<year>.json) published next to this script,
 * so it never depends on a server being awake. It renders inside a Shadow DOM:
 * the host page's styles can't change it, and its styles can't leak into the page.
 */
(function () {
  'use strict'

  var script = document.currentScript
  var BASE = script ? script.src.replace(/[^/]*$/, '') : './'

  var MONTHS_AM = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን']
  var WEEKDAYS_AM = ['እሑድ', 'ሰኞ', 'ማክሰ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ']
  var WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  // Amharic names for each fast and feast id. To be reviewed by the parish before launch.
  var NAMES_AM = {
    'tsome-nebiyat': 'ጾመ ነቢያት',
    'gehad-timkat': 'ገሀድ',
    'tsome-nenewe': 'ጾመ ነነዌ',
    'abiy-tsom': 'ዐቢይ ጾም',
    'tsome-hawaryat': 'ጾመ ሐዋርያት',
    'tsome-filseta': 'ጾመ ፍልሰታ',
    'tsome-dihnet': 'ጾመ ድኅነት',
    enkutatash: 'እንቁጣጣሽ',
    meskel: 'መስቀል',
    'hidar-tsion': 'ኅዳር ጽዮን',
    genna: 'ገና',
    timkat: 'ጥምቀት',
    'debre-zeit': 'ደብረ ዘይት',
    hosanna: 'ሆሣዕና',
    siklet: 'ስቅለት',
    fasika: 'ፋሲካ',
    'rikbe-kahnat': 'ርክበ ካህናት',
    erget: 'ዕርገት',
    paraclete: 'ጰራቅሊጦስ',
    'peter-and-paul': 'ጴጥሮስ ወጳውሎስ',
    filseta: 'ፍልሰታ ለማርያም',
    'tir-mikael': 'ጥር ሚካኤል',
    'kidane-mehret': 'ኪዳነ ምሕረት',
  }

  // "Each year is dedicated to one of the four Evangelists": the year of Luke is the leap year.
  var EVANGELISTS = {
    Matthew: { am: 'ዘመነ ማቴዎስ', en: 'Year of Matthew' },
    Mark: { am: 'ዘመነ ማርቆስ', en: 'Year of Mark' },
    Luke: { am: 'ዘመነ ሉቃስ', en: 'Year of Luke' },
    John: { am: 'ዘመነ ዮሐንስ', en: 'Year of John' },
  }

  function evangelistText(e, lang) {
    var x = EVANGELISTS[e]
    if (!x) return ''
    return lang === 'am' ? x.am : lang === 'en' ? x.en : x.am + ' · ' + x.en
  }

  function commemorationText(c, lang) {
    return lang === 'am' ? c.nameAmharic : lang === 'en' ? c.name : c.nameAmharic + ' · ' + c.name
  }

  var yearCache = {}

  function loadYear(year) {
    if (!yearCache[year]) {
      yearCache[year] = fetch(BASE + 'data/' + year + '.json').then(function (r) {
        if (!r.ok) throw new Error('No calendar data for ' + year)
        return r.json()
      })
    }
    return yearCache[year]
  }

  function isoToday() {
    var d = new Date()
    var pad = function (n) { return (n < 10 ? '0' : '') + n }
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
  }

  /** Finds today (month, day) by looking it up in the data: no date arithmetic to get wrong. */
  function findToday() {
    var iso = isoToday()
    var gy = Number(iso.slice(0, 4))
    // The Ethiopian year starts in September, so today is in year gy-8 or gy-7.
    var guesses = [gy - 8, gy - 7]
    return Promise.all(guesses.map(function (y) { return loadYear(y).catch(function () { return null }) }))
      .then(function (years) {
        for (var i = 0; i < years.length; i++) {
          var data = years[i]
          if (!data) continue
          for (var m = 0; m < data.months.length; m++) {
            var days = data.months[m].days
            for (var d = 0; d < days.length; d++) {
              if (days[d].gregorian === iso) return { year: data.year, month: m + 1, day: days[d], monthName: data.months[m].name, evangelist: data.evangelist }
            }
          }
        }
        throw new Error('Today is not in the published calendar data')
      })
  }

  function name(item, lang) {
    var am = NAMES_AM[item.id]
    if (lang === 'am' && am) return am
    if (lang === 'en' || !am) return item.name
    return am + ' · ' + item.name
  }

  function monthTitle(month, monthName, year, lang) {
    var am = MONTHS_AM[month - 1] + ' ' + year
    var en = monthName + ' ' + year
    return lang === 'am' ? am : lang === 'en' ? en : am + ' · ' + en
  }

  function formatGregorian(iso, opts) {
    var p = iso.split('-').map(Number)
    return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString('en-US', opts)
  }

  function el(tag, className, text) {
    var e = document.createElement(tag)
    if (className) e.className = className
    if (text != null) e.textContent = text
    return e
  }

  var STYLES = [
    ':host{display:block;--accent:#8a1c1c;--fast:#f6e7c8;--line:#e6e1d8}',
    // Shadow DOM blocks the page's CSS rules but not inherited properties (colour, font size...),
    // so the outer elements set them all explicitly.
    '.wrap,.banner,.error{color:#1d1d1f;font:400 16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans Ethiopic",sans-serif;text-align:left;letter-spacing:normal;text-transform:none;font-style:normal;word-spacing:normal}',
    '.wrap{border:1px solid var(--line);border-radius:14px;background:#fff;padding:16px;max-width:560px;box-sizing:border-box}',
    '.head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px}',
    '.title{font-size:1.15em;font-weight:700;text-align:center;flex:1}',
    '.sub{display:block;font-size:.8em;font-weight:400;color:#6b6b6b;margin-top:2px}',
    'button.nav{width:40px;height:40px;border-radius:50%;border:1px solid var(--line);background:#fff;font-size:20px;cursor:pointer;color:inherit;flex:none}',
    'button.nav:hover,button.nav:focus-visible{border-color:var(--accent);color:var(--accent);outline:none}',
    '.grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px}',
    '.wd{text-align:center;font-size:.72em;font-weight:700;color:#6b6b6b;padding-bottom:4px}',
    '.day{aspect-ratio:1;border-radius:8px;border:1px solid transparent;background:#f7f5f1;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.1}',
    '.day .e{font-size:1.05em;font-weight:700}',
    '.day .g{font-size:.62em;color:#6b6b6b}',
    '.day.fast{background:var(--fast)}',
    '.day.feast{border-color:var(--accent)}',
    // A parish tabot day: a small gold mark under the date.
    '.day.tabot::after{content:"";width:6px;height:6px;border-radius:50%;background:#b8860b;margin-top:2px}',
    '.day.today.tabot::after{background:#f2c14e}',
    // Today is a solid dark fill, so it can't be confused with a feast's outline.
    '.day.today{background:#1d1d1f;color:#fff}',
    '.day.today .g{color:#d8d8d8}',
    '.legend{display:flex;gap:14px;font-size:.78em;color:#6b6b6b;margin:10px 0 0;flex-wrap:wrap}',
    '.legend i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:5px}',
    '.events{list-style:none;margin:14px 0 0;padding:0;border-top:1px solid var(--line)}',
    '.events li{padding:9px 0;border-bottom:1px solid var(--line);font-size:.92em}',
    '.events .when{display:block;font-size:.8em;color:#6b6b6b}',
    '.subscribe{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}',
    '.subscribe a{flex:1;min-width:140px;text-align:center;padding:10px 12px;border-radius:10px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;font-size:.9em}',
    '.subscribe a.alt{background:#fff;color:var(--accent);border:1px solid var(--accent)}',
    '.banner{border-radius:12px;background:var(--fast);padding:12px 16px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:baseline}',
    '.banner.plain{background:#f7f5f1}',
    '.banner strong{font-size:1.05em}',
    '.banner span{color:#4a4a4a}',
    '.error{color:#8a1c1c;font-size:.9em}',
  ].join('\n')

  /** The parish's tabot days that fall on this Ethiopian month and day. */
  function tabotsOn(parish, month, day) {
    if (!parish) return []
    return parish.tabots.filter(function (t) { return t.month === month && t.day === day })
  }

  function tabotText(t, lang) {
    var en = t.occasion + ': ' + t.saint + ' tabot'
    if (lang === 'en') return en
    if (lang === 'am') return t.saintAmharic + ' · ታቦት'
    return t.saintAmharic + ' · ' + en
  }

  function renderToday(root, lang, parish) {
    return findToday().then(function (t) {
      var b = el('div', 'banner' + (t.day.fasts.length ? '' : ' plain'))
      var date = lang === 'en' ? t.monthName + ' ' + t.day.day + ', ' + t.year : MONTHS_AM[t.month - 1] + ' ' + t.day.day + ' ' + t.year
      b.appendChild(el('strong', null, date))
      var tabots = tabotsOn(parish, t.month, t.day.day)
      var parts = tabots.map(function (x) { return tabotText(x, lang) })
      t.day.feasts.forEach(function (f) { parts.push(name(f, lang)) })
      ;(t.day.commemorations || [])
        // Skip a monthly feast for a saint whose tabot is already shown (e.g. St. Michael on Hidar 12).
        .filter(function (c) { return !tabots.some(function (x) { return x.saintAmharic === c.nameAmharic }) })
        .forEach(function (c) { parts.push(commemorationText(c, lang)) })
      t.day.fasts.forEach(function (f) {
        parts.push(name(f, lang) + (f.total > 1 ? (lang === 'am' ? ' (' + f.day + '/' + f.total + ')' : ' · day ' + f.day + ' of ' + f.total) : ''))
      })
      if (!parts.length) parts.push(lang === 'am' ? 'የጾም ቀን አይደለም' : 'Not a fast day')
      b.appendChild(el('span', null, parts.join(' · ')))
      root.appendChild(b)
    })
  }

  function renderMonth(root, lang, parish) {
    var wrap = el('div', 'wrap')
    root.appendChild(wrap)
    var state = null

    function show(year, month) {
      return loadYear(year).then(function (data) {
        state = { year: year, month: month }
        var m = data.months[month - 1]
        wrap.textContent = ''

        var head = el('div', 'head')
        var prev = el('button', 'nav', '‹')
        prev.setAttribute('aria-label', 'Previous month')
        var next = el('button', 'nav', '›')
        next.setAttribute('aria-label', 'Next month')
        var title = el('div', 'title', monthTitle(month, m.name, year, lang))
        var first = m.days[0].gregorian, last = m.days[m.days.length - 1].gregorian
        title.appendChild(el('span', 'sub', formatGregorian(first, { month: 'short', day: 'numeric' }) + ' – ' + formatGregorian(last, { month: 'short', day: 'numeric', year: 'numeric' })))
        if (data.evangelist) title.appendChild(el('span', 'sub', evangelistText(data.evangelist, lang)))
        prev.onclick = function () { go(-1) }
        next.onclick = function () { go(1) }
        head.appendChild(prev); head.appendChild(title); head.appendChild(next)
        wrap.appendChild(head)

        var grid = el('div', 'grid')
        grid.setAttribute('role', 'grid')
        ;(lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_AM).forEach(function (w) { grid.appendChild(el('div', 'wd', w)) })
        for (var i = 0; i < m.days[0].weekday; i++) grid.appendChild(el('div'))
        var todayIso = isoToday()
        var events = []
        m.days.forEach(function (d) {
          var tabots = tabotsOn(parish, month, d.day)
          var cls = 'day' + (d.fasts.length ? ' fast' : '') + (d.feasts.length ? ' feast' : '') + (tabots.length ? ' tabot' : '') + (d.gregorian === todayIso ? ' today' : '')
          var cell = el('div', cls)
          cell.setAttribute('role', 'gridcell')
          var label = [monthTitle(month, m.name, year, 'en').replace(' ' + year, ' ' + d.day + ', ' + year), formatGregorian(d.gregorian, { weekday: 'long', month: 'long', day: 'numeric' })]
          d.fasts.concat(d.feasts).forEach(function (x) { label.push(x.name) })
          tabots.forEach(function (t) { label.push(t.occasion + ': ' + t.saint + ' tabot') })
          ;(d.commemorations || []).forEach(function (c) { label.push(c.name + ' (monthly)') })
          cell.setAttribute('aria-label', label.join('. '))
          cell.title = label.join('\n')
          cell.appendChild(el('span', 'e', String(d.day)))
          cell.appendChild(el('span', 'g', formatGregorian(d.gregorian, { month: d.day === 1 || d.gregorian.slice(8) === '01' ? 'short' : undefined, day: 'numeric' })))
          grid.appendChild(cell)
          tabots.forEach(function (t) { events.push({ d: d, text: tabotText(t, lang) }) })
          d.feasts.forEach(function (f) { events.push({ d: d, text: name(f, lang) }) })
          d.fasts.forEach(function (f) { if (f.day === 1 && f.total > 1) events.push({ d: d, text: name(f, lang) + (lang === 'am' ? ' ይጀምራል (' + f.total + ' ቀናት)' : ' begins (' + f.total + ' days)') }) })
        })
        wrap.appendChild(grid)

        var legend = el('div', 'legend')
        var lf = el('span'); var sf = el('i'); sf.style.background = 'var(--fast)'; lf.appendChild(sf); lf.appendChild(document.createTextNode(lang === 'en' ? 'Fast day' : lang === 'am' ? 'የጾም ቀን' : 'የጾም ቀን · Fast day'))
        var le = el('span'); var se = el('i'); se.style.border = '1px solid var(--accent)'; le.appendChild(se); le.appendChild(document.createTextNode(lang === 'en' ? 'Feast' : lang === 'am' ? 'በዓል' : 'በዓል · Feast'))
        var lt = el('span'); var st = el('i'); st.style.background = '#1d1d1f'; lt.appendChild(st); lt.appendChild(document.createTextNode(lang === 'en' ? 'Today' : lang === 'am' ? 'ዛሬ' : 'ዛሬ · Today'))
        legend.appendChild(lf); legend.appendChild(le); legend.appendChild(lt)
        if (parish && parish.tabots.length) {
          var lb = el('span'); var sb = el('i'); sb.style.background = '#b8860b'; sb.style.borderRadius = '50%'; lb.appendChild(sb)
          lb.appendChild(document.createTextNode(lang === 'en' ? 'Tabot' : lang === 'am' ? 'ታቦት' : 'ታቦት · Tabot'))
          legend.appendChild(lb)
        }
        wrap.appendChild(legend)

        if (events.length) {
          var list = el('ul', 'events')
          events.forEach(function (ev) {
            var li = el('li')
            li.appendChild(el('span', 'when', MONTHS_AM[month - 1] + ' ' + ev.d.day + ' · ' + formatGregorian(ev.d.gregorian, { weekday: 'long', month: 'long', day: 'numeric' })))
            li.appendChild(document.createTextNode(ev.text))
            list.appendChild(li)
          })
          wrap.appendChild(list)
        }

        // A parish's feed includes its tabot days; otherwise the general feed.
        var feed = BASE.replace(/^https?:/, '') + (parish ? 'parishes/' + parish.id + '/calendar.ics' : 'calendar.ics')
        var sub = el('div', 'subscribe')
        var google = el('a', null, lang === 'am' ? 'ወደ Google ቀን መቁጠሪያ' : 'Add to Google Calendar')
        google.href = 'https://calendar.google.com/calendar/r?cid=' + encodeURIComponent('webcal:' + feed)
        google.target = '_blank'; google.rel = 'noopener'
        var apple = el('a', 'alt', lang === 'am' ? 'ወደ ስልክዎ (Apple / Outlook)' : 'Add to Apple / Outlook')
        apple.href = 'webcal:' + feed
        sub.appendChild(google); sub.appendChild(apple)
        wrap.appendChild(sub)
      })
    }

    function go(delta) {
      var month = state.month + delta, year = state.year
      if (month < 1) { month = 13; year-- }
      if (month > 13) { month = 1; year++ }
      show(year, month).catch(function () { /* no data that far out: stay on the current month */ })
    }

    return findToday().then(function (t) { return show(t.year, t.month) })
  }

  function mount(host) {
    if (host.__ethiopianCalendar) return
    host.__ethiopianCalendar = true
    var root = host.attachShadow({ mode: 'open' })
    var style = el('style', null, STYLES)
    root.appendChild(style)
    if (host.dataset.accent) host.style.setProperty('--accent', host.dataset.accent)
    var lang = host.dataset.lang || 'both'
    var render = host.dataset.view === 'today' ? renderToday : renderMonth
    var parishId = host.dataset.parish
    var parish = parishId
      ? fetch(BASE + 'parishes/' + encodeURIComponent(parishId) + '.json').then(function (r) {
          if (!r.ok) throw new Error('Unknown parish "' + parishId + '"')
          return r.json()
        })
      : Promise.resolve(null)
    parish.then(function (p) { return render(root, lang, p) }).catch(function (e) {
      root.appendChild(el('p', 'error', 'The calendar could not be loaded. ' + e.message))
    })
  }

  function init() {
    var hosts = document.querySelectorAll('.ethiopian-calendar')
    for (var i = 0; i < hosts.length; i++) mount(hosts[i])
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
})()
