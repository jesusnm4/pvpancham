// Owns state, form wiring and rendering. Team math lives in js/engine.js, data loading in js/data.js.
(function () {
  var KEY = 'pvphelper-state-v1';
  var IV_KEY = 'pvphelper-ivs-v1';
  var SAVED_KEY = 'pvphelper-saved-v1';   // teams the viewer saved: [{ hash, league, noElite, ids, names, score }]
  var MAX_SAVED = 12;   // { speciesId: [atk, def, hp] } the viewer entered
  // Formats on offer (data/formats.js, from the GO Battle League schedule): the open leagues always,
  // plus cups that are live now or start within UPCOMING_DAYS, by the viewer's clock.
  var UPCOMING_DAYS = 7;
  var NOW = Date.now();
  var FORMAT_DATA = (window.PvpData && window.PvpData.raw.formats) || { schedule: null, formats: [], other: [] };
  // Start of a format's current or next week, so cups list live ones first, then by start date.
  function nextStart(f) {
    var w = f.weeks.filter(function (w) { return w[1] > NOW; })[0];
    return w ? w[0] : Infinity;
  }
  var FORMATS = FORMAT_DATA.formats.filter(function (f) {
    return f.cup === 'all' || f.weeks.some(function (w) { return w[1] > NOW && w[0] < NOW + UPCOMING_DAYS * 864e5; });
  });
  FORMATS = FORMATS.filter(function (f) { return f.cup === 'all'; }).concat(FORMATS.filter(function (f) { return f.cup !== 'all'; })
    .sort(function (x, y) { return nextStart(x) - nextStart(y); }));
  var LEAGUES = FORMATS.map(function (f) { return f.id; });
  var LEAGUE_NAMES = {}, LEAGUE_CP = {}, LEAGUE_CUP = {};   // LEAGUE_CUP: PvPoke cup id, for links
  FORMATS.forEach(function (f) { LEAGUE_NAMES[f.id] = f.name; LEAGUE_CP[f.id] = f.cp; LEAGUE_CUP[f.id] = f.cup; });
  var STYLES = ['abc', 'pair', 'any'];
  // Styles that were merged into another; old saved state and shared links still work.
  var STYLE_ALIASES = { abb: 'pair', aba: 'pair' };
  // The 'any' value is kept (saved state and shared links use it); only the label changed.
  var STYLE_NAMES = { abc: 'ABC', pair: 'Shared type', any: 'Best score' };
  var STYLE_HINTS = { abc: 'ABC style', pair: 'shared type style (ABB / ABA)', any: 'best score (no typing rule)' };
  // What each typing layout (lead / swap / closer) means, for the team detail.
  var LAYOUT_NOTES = {
    ABC: 'no two members share a type',
    ABB: 'the safe swap and closer share a type',
    ABA: 'the lead and closer share a type',
    AAB: 'the lead and safe swap share a type',
    AAA: 'all three share a type'
  };
  var ROLE_NAMES = { lead: 'Lead', swap: 'Safe swap', closer: 'Closer' };
  // One line per role, shown on each member card for players who don't know the terms.
  var ROLE_NOTES = {
    lead: 'Starts the battle.',
    swap: 'Switch to it when your lead is losing.',
    closer: 'Comes in last to finish the battle.'
  };
  var MAX_MATCHES = 8;
  var QUICK_PICKS = 6;
  var PICK_ID = /^[a-z0-9_]{1,64}$/;   // shape of a PvPoke species id

  var startNotice = '';   // set by load() when a shared link names a format that is over
  var state = load();
  var contexts = {};   // league -> Engine context, built once per league
  var images = {};     // species id -> image stem (data/images.js)
  var teams = [];      // current suggestions (engine teams)
  var described = [];  // Engine.describeTeam() of each, for the detail view
  var runId = 0;       // ignores results from a superseded search
  var revealResults = false;  // set by a user pick: scroll new results into view if off-screen
  var fixes = [];             // one-tap fixes offered with the current message: [{ label, run }]
  var leagueUndo = null;      // { league, picks } before the last league change, to undo dropped picks
  var TOP_COUNT = 3;
  var topTeams = {};   // contextKey -> Engine.bestTeams() for the banner (best score, no typing rule)
  var topRunId = 0;    // ignores a banner search for a league the viewer already left
  var openThird = null;  // a banner team being opened: select the result that has this third member

  // ---- Persistence: localStorage remembers the last view; the URL hash makes it shareable ----
  // Hash format: #l=great&s=abc&p=medicham,azumarill&t=2&c=3 (t is the 1-based selected team, c the
  // 1-based team it is compared with).

  // Copies the recognised fields of `saved` onto `s`. Pick ids are only checked for shape here;
  // whether they are ranked in the league is checked once rankings load (see validatePicks).
  function applySaved(s, saved) {
    if (LEAGUES.indexOf(saved.league) !== -1) s.league = saved.league;
    var style = STYLE_ALIASES[saved.style] || saved.style;
    if (STYLES.indexOf(style) !== -1) s.style = style;
    if (Array.isArray(saved.picks)) {
      s.picks = compactPicks([0, 1, 2].map(function (i) {
        var id = saved.picks[i];
        return typeof id === 'string' && PICK_ID.test(id) ? id : null;
      }));
    }
    if (typeof saved.selected === 'number' && saved.selected >= 0 && saved.selected < 5) s.selected = Math.floor(saved.selected);
    if (typeof saved.noElite === 'boolean') s.noElite = saved.noElite;
    if (typeof saved.pilotHidden === 'boolean') s.pilotHidden = saved.pilotHidden;
    // The team compared with the selected one (0-based), or null; only set when the source has the field.
    if ('compare' in saved) {
      s.compare = typeof saved.compare === 'number' && saved.compare >= 0 && saved.compare < 5 && saved.compare === Math.floor(saved.compare)
        ? saved.compare : null;
    }
    return s;
  }

  // Filled slots first, padded to the three slots, so "n picks" always means slots 0 to n-1.
  function compactPicks(picks) {
    var out = picks.filter(Boolean).slice(0, 3);
    while (out.length < 3) out.push(null);
    return out;
  }

  function readHash() {
    var params = new URLSearchParams(location.hash.replace(/^#/, ''));
    if (!params.get('p') && !params.get('l')) return null;
    return {
      league: params.get('l'),
      style: params.get('s'),
      picks: (params.get('p') || '').split(',').filter(Boolean),
      selected: Number(params.get('t')) - 1,
      noElite: params.get('e') === '0',
      compare: params.get('c') ? Number(params.get('c')) - 1 : null
    };
  }

  function hashFor(st) {
    var picks = st.picks.filter(Boolean);
    if (!picks.length) return '';
    return '#l=' + st.league + '&s=' + st.style + '&p=' + picks.map(encodeURIComponent).join(',') +
      (st.selected ? '&t=' + (st.selected + 1) : '') + (st.noElite ? '&e=0' : '') +
      (st.compare !== null && st.compare !== undefined ? '&c=' + (st.compare + 1) : '');
  }

  function load() {
    var s = { league: 'great', style: 'abc', picks: [null, null, null], selected: 0, noElite: false, compare: null, pilotHidden: false };
    try {
      applySaved(s, JSON.parse(localStorage.getItem(KEY) || '{}'));
    } catch (e) { /* private mode or bad JSON: keep defaults */ }
    var shared = readHash();
    // A shared link replaces the remembered view entirely, including empty slots.
    if (shared) applySaved(s, { league: shared.league, style: shared.style, picks: shared.picks, selected: shared.selected, noElite: shared.noElite, compare: shared.compare });
    if (shared && shared.league && LEAGUES.indexOf(shared.league) === -1) {
      startNotice = 'That link is for a cup that is no longer in GO Battle League, so it opened in ' + LEAGUE_NAMES[s.league] + '.';
    }
    return s;
  }

  // The view in localStorage only; save() also updates the link.
  function saveLocal() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ league: state.league, style: state.style, picks: state.picks, selected: state.selected,
        noElite: state.noElite, compare: state.compare, pilotHidden: state.pilotHidden }));
    } catch (e) { /* private mode */ }
  }

  function save() {
    saveLocal();
    var hash = hashFor(state);
    if (hash !== location.hash) {
      history.replaceState(null, '', hash || location.pathname + location.search);
    }
  }

  // IVs the viewer typed into "Check your IVs", remembered per species on this device only.
  function loadIvs() {
    try {
      var saved = JSON.parse(localStorage.getItem(IV_KEY) || '{}');
      return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
    } catch (e) { return {}; }
  }

  function saveIvs(id, ivs) {
    var all = loadIvs();
    if (ivs) all[id] = ivs; else delete all[id];
    try { localStorage.setItem(IV_KEY, JSON.stringify(all)); } catch (e) { /* private mode */ }
  }

  function savedIvs(id) {
    var v = loadIvs()[id];
    var valid = Array.isArray(v) && v.length === 3 && v.every(function (n) {
      return typeof n === 'number' && n === Math.floor(n) && n >= 0 && n <= 15;
    });
    return valid ? v : null;
  }

  // ---- Helpers ----

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function normalize(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  // Pokémon GO icon for a species id, or '' when there is none. Decorative: the name is always
  // next to it, so alt is empty. Shadow forms share the normal icon and get a purple glow.
  function icon(id, size) {
    var stem = images[id];
    if (!stem) return '';
    var shadow = /_shadow$/.test(id) ? ' shadow' : '';
    return '<img class="poke' + shadow + '" src="img/pokemon/' + encodeURIComponent(stem) + '.webp" alt="" width="' + size +
      '" height="' + size + '" loading="lazy" decoding="async">';
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function typeChips(types) {
    return types.map(function (t) {
      return '<span class="type" data-type="' + escapeHtml(t) + '">' + escapeHtml(capitalize(t)) + '</span>';
    }).join('');
  }

  // Plain-language reading of a battle rating (500 = even).
  // The three bands of the meta grid, on the same thresholds as verdict().
  function band(rating) { return rating > 550 ? 'win' : rating >= 450 ? 'even' : 'loss'; }
  var BAND_NAMES = { win: 'win', even: 'toss-up', loss: 'loss' };

  function verdict(rating) {
    if (rating >= 700) return 'strong win';
    if (rating > 550) return 'win';
    if (rating >= 450) return 'toss-up';
    if (rating >= 300) return 'loss';
    return 'hard loss';
  }

  // Engine contexts are per league and per Elite TM setting (team movesets differ).
  function contextKey(league) { return league + (state.noElite ? ':noelite' : ''); }

  function contextFor(league) {
    var key = contextKey(league);
    return Promise.all([window.PvpData.gamemaster(), window.PvpData.rankings(league), window.PvpData.images()]).then(function (data) {
      images = data[2];
      if (!contexts[key]) contexts[key] = window.Engine.createContext(data[0], data[1], LEAGUE_CP[league], { noElite: state.noElite });
      return contexts[key];
    });
  }

  function currentPicks() {
    return state.picks.filter(Boolean);
  }

  // ---- Pokémon search (combobox) ----

  function setupCombo(combo) {
    var slot = Number(combo.dataset.slot);
    var input = combo.querySelector('input');
    var list = combo.querySelector('.combo-list');
    var clear = combo.querySelector('.clear');
    var matches = [];
    var active = -1;

    function selectedName() {
      var id = state.picks[slot];
      var ctx = contexts[contextKey(state.league)];
      return id && ctx && ctx.byId[id] ? ctx.byId[id].pokemon.name : '';
    }

    function close() {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function search(query) {
      var ctx = contexts[contextKey(state.league)];
      var q = normalize(query);
      if (!ctx || !q) return [];
      // The other slots' species can't be picked again, nor a second Mega.
      var others = state.picks.filter(function (id, i) { return i !== slot && id && ctx.byId[id]; });
      var otherDex = others.map(function (id) { return ctx.byId[id].pokemon.dex; });
      var megaTaken = others.some(function (id) { return isMegaId(ctx, id); });
      var starts = [], contains = [];
      ctx.ranked.forEach(function (e) {
        if (otherDex.indexOf(e.pokemon.dex) !== -1 || (megaTaken && isMegaId(ctx, e.id))) return;
        var name = normalize(e.pokemon.name);
        var nick = (e.pokemon.nicknames || []).some(function (n) { return normalize(n).indexOf(q) === 0; });
        if (name.indexOf(q) === 0 || nick) starts.push(e);
        else if (name.indexOf(q) !== -1) contains.push(e);
      });
      // ctx.ranked is already in ranking order, so each group stays best-first.
      return starts.concat(contains).slice(0, MAX_MATCHES);
    }

    function renderList() {
      if (!matches.length) {
        list.innerHTML = '<li class="empty" role="option" aria-disabled="true">No ranked Pokémon matches</li>';
      } else {
        var ctx = contexts[contextKey(state.league)];
        list.innerHTML = matches.map(function (e, i) {
          return '<li role="option" id="pick-' + slot + '-opt-' + i + '" data-index="' + i + '"' +
            (i === active ? ' aria-selected="true" class="active"' : '') + '>' +
            '<span class="opt-name">' + icon(e.id, 28) + escapeHtml(e.pokemon.name) + '</span>' +
            '<span class="opt-meta">' + typeChips(e.pokemon.types) +
            ' <small>#' + (ctx.ranked.indexOf(e) + 1) + '</small></span></li>';
        }).join('');
      }
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (active >= 0) input.setAttribute('aria-activedescendant', 'pick-' + slot + '-opt-' + active);
      else input.removeAttribute('aria-activedescendant');
    }

    function choose(entry) {
      input.value = entry.pokemon.name;
      close();
      setPick(slot, entry.id);
    }

    input.addEventListener('input', function () {
      matches = search(input.value);
      active = matches.length ? 0 : -1;
      if (input.value.trim()) renderList(); else close();
    });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        if (list.hidden) { matches = search(input.value); active = -1; }
        if (!matches.length) return;
        ev.preventDefault();
        var step = ev.key === 'ArrowDown' ? 1 : -1;
        active = (active + step + matches.length) % matches.length;
        renderList();
      } else if (ev.key === 'Enter') {
        if (!list.hidden && active >= 0 && matches[active]) {
          ev.preventDefault();
          choose(matches[active]);
        }
      } else if (ev.key === 'Escape') {
        if (!list.hidden) { ev.preventDefault(); close(); input.value = selectedName(); }
      }
    });

    // mousedown, not click: it fires before the input's blur, which would close the list first.
    list.addEventListener('mousedown', function (ev) {
      var li = ev.target.closest('li[data-index]');
      if (!li) return;
      ev.preventDefault();
      choose(matches[Number(li.dataset.index)]);
    });

    input.addEventListener('blur', function () {
      close();
      // Typing without choosing leaves the previous pick in place.
      input.value = selectedName();
    });

    clear.addEventListener('click', function () {
      input.value = '';
      setPick(slot, null);
      input.focus();
    });

    return {
      sync: function () {
        if (document.activeElement !== input) input.value = selectedName();
        clear.hidden = !state.picks[slot];
      }
    };
  }

  var combos = Array.prototype.map.call(document.querySelectorAll('.combo'), setupCombo);

  function syncCombos() {
    combos.forEach(function (c) { c.sync(); });
    // The third field appears once two are picked; three picks are a finished team, so the team
    // style has nothing to choose.
    var count = currentPicks().length;
    document.querySelector('.combo[data-slot="2"]').hidden = count < 2;
    document.querySelector('fieldset.style').disabled = count === 3;
    document.getElementById('style-note').hidden = count !== 3;
  }

  function setPick(slot, id) {
    state.picks[slot] = id;
    // Keep the filled slots first, so "one pick" always means slot 0.
    state.picks = compactPicks(state.picks);
    state.selected = 0;
    state.compare = null;
    save();
    syncCombos();
    renderQuickPicks();
    revealResults = !!id;
    runSearch();
  }

  // Drops saved picks that are not ranked in the current league.
  function validatePicks(ctx) {
    var dropped = state.picks.filter(function (id) { return id && !ctx.byId[id]; });
    state.picks = compactPicks(state.picks.filter(function (id) { return id && ctx.byId[id]; }));
    if (dropped.length) save();
    return dropped;
  }

  function renderQuickPicks() {
    var el = document.getElementById('quick-picks');
    var ctx = contexts[contextKey(state.league)];
    if (!ctx || currentPicks().length >= 2) { el.innerHTML = ''; return; }
    var taken = currentPicks().map(function (id) { return ctx.byId[id].pokemon.dex; });
    var top = ctx.ranked.filter(function (e) { return taken.indexOf(e.pokemon.dex) === -1; }).slice(0, QUICK_PICKS);
    el.innerHTML = '<span class="quick-label">Popular in ' + LEAGUE_NAMES[state.league] + ':</span> ' +
      top.map(function (e) {
        return '<button type="button" class="chip" data-id="' + escapeHtml(e.id) + '">' + escapeHtml(e.pokemon.name) + '</button>';
      }).join('');
  }

  document.getElementById('quick-picks').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-id]');
    if (!btn) return;
    setPick(currentPicks().length, btn.dataset.id);
  });

  // ---- Results ----

  function resultsEl() { return document.getElementById('results'); }

  function notBusy() {
    resultsEl().classList.remove('busy');
    resultsEl().removeAttribute('aria-busy');
  }

  function showMessage(html, cls, actions) {
    notBusy();
    resultsEl().hidden = false;
    resultsEl().innerHTML = '<p class="' + (cls || 'placeholder') + '">' + html + '</p>' + fixButtons(actions);
  }

  // Buttons that fix what a message describes, so a dead end is one tap from a result.
  function fixButtons(actions) {
    fixes = actions || [];
    if (!fixes.length) return '';
    return '<p class="fixes">' + fixes.map(function (f, i) {
      return '<button type="button" class="chip" data-fix="' + i + '">' + escapeHtml(f.label) + '</button>';
    }).join('') + '</p>';
  }

  function isMegaId(ctx, id) {
    var e = ctx.byId[id];
    return !!(e && e.pokemon.tags && e.pokemon.tags.indexOf('mega') !== -1);
  }

  function setStyle(style) {
    state.style = style;
    state.selected = 0;
    state.compare = null;
    save();
    syncRadios();
    runSearch();
  }

  function runSearch(notice) {
    var id = ++runId;
    var league = state.league;
    var third = openThird;  // only the search a banner click starts selects its team
    openThird = null;
    var undo = leagueUndo;  // only the search a league change starts can offer to undo it
    leagueUndo = null;
    var actions = [];
    contextFor(league).then(function (ctx) {
      if (id !== runId) return;
      var dropped = validatePicks(ctx);
      syncCombos();
      renderQuickPicks();
      if (dropped.length) {
        notice = dropped.length === 1 ? 'Your previous pick isn’t ranked in ' + LEAGUE_NAMES[league] + ', so it was removed.'
          : 'Your previous picks aren’t ranked in ' + LEAGUE_NAMES[league] + ', so they were removed.';
        if (undo && undo.league !== league && LEAGUES.indexOf(undo.league) !== -1) {
          actions.push({ label: 'Back to ' + LEAGUE_NAMES[undo.league], run: function () {
            state.league = undo.league;
            state.picks = undo.picks.slice();
            state.selected = 0;
            state.compare = null;
            save();
            syncRadios();
            revealLeague();
            applyAccent();
            syncCombos();
            renderQuickPicks();
            runSearch();
            renderTopTeams();
          } });
        }
      }
      var picks = currentPicks();
      if (!picks.length) {
        teams = [];
        described = [];
        // Nothing to show yet: the top teams below the form are the starting point.
        if (notice) showMessage(escapeHtml(notice), 'notice', actions);
        else { notBusy(); resultsEl().hidden = true; resultsEl().innerHTML = ''; }
        return;
      }
      // Keep the current teams on screen, dimmed, while the new ones are found; else say so.
      if (resultsEl().querySelector('.team-list')) {
        resultsEl().classList.add('busy');
        resultsEl().setAttribute('aria-busy', 'true');
      } else {
        showMessage('Finding the best teams…');
      }
      // Let the message paint before the search blocks the main thread (up to about a second).
      setTimeout(function () {
        if (id !== runId) return;
        try {
          teams = window.Engine.suggest(ctx, picks, state.style, 5);
        } catch (err) {
          // Two Megas: offer to drop either one.
          var megaFixes = picks.filter(function (p) { return isMegaId(ctx, p); }).length > 1
            ? picks.map(function (p, slot) {
                return isMegaId(ctx, p) ? { label: 'Remove ' + ctx.byId[p].pokemon.name, run: function () { setPick(slot, null); } } : null;
              }).filter(Boolean)
            : [];
          showMessage(escapeHtml(err.message), 'error', megaFixes);
          return;
        }
        if (!teams.length) {
          showMessage('No ' + STYLE_NAMES[state.style] + ' team fits ' + (picks.length === 1 ? 'this pick' : 'these picks') +
            '. Try another team style:', 'placeholder', STYLES.filter(function (st) { return st !== state.style; }).map(function (st) {
              return { label: 'Try ' + STYLE_NAMES[st], run: function () { setStyle(st); } };
            }));
          return;
        }
        if (third) {
          var found = teams.findIndex(function (t) { return t.members.some(function (m) { return m.id === third; }); });
          state.selected = Math.max(found, 0);
          save();
        }
        state.selected = Math.min(state.selected, teams.length - 1);
        renderTeams(ctx, notice, actions);
      }, 30);
    }).catch(function (err) {
      if (id !== runId) return;
      showMessage('Could not load Pokémon data (' + escapeHtml(err.message) + ').', 'error',
        [{ label: 'Reload the page', run: function () { location.reload(); } }]);
    });
  }

  function renderTeams(ctx, notice, actions) {
    // A link or saved view can name a comparison that no longer fits the results.
    if (state.compare !== null && (state.compare >= teams.length || state.compare === state.selected)) { state.compare = null; save(); }
    described = teams.map(function (t) { return window.Engine.describeTeam(ctx, t); });
    var picks = currentPicks();
    var own = picks.length === 3;   // the viewer's own team: no list of alternatives
    var heading = own ? 'Your team'
      : picks.length === 1 ? 'Best partners for ' + escapeHtml(ctx.byId[picks[0]].pokemon.name)
      : 'Best third for ' + escapeHtml(ctx.byId[picks[0]].pokemon.name) + ' and ' + escapeHtml(ctx.byId[picks[1]].pokemon.name);

    var list = described.map(function (d, i) {
      return '<li><button type="button" class="team-option" data-team="' + i + '" aria-pressed="' + (i === state.selected) + '">' +
        '<span class="team-rank">' + (i + 1) + '</span>' +
        '<span class="team-icons">' + d.members.map(function (m) { return icon(m.id, 32); }).join('') + '</span>' +
        '<span class="team-names">' + d.members.map(function (m) { return escapeHtml(m.name); }).join(' · ') + '</span>' +
        // With the ABC style every team is ABC, so the tag would only repeat itself.
        (state.style === 'abc' ? '' : '<span class="layout" title="Typing layout (lead / safe swap / closer)">' + d.layout + '</span>') +
        '<span class="team-score" title="Team score out of 100">' + d.displayScore + '</span></button></li>';
    }).join('');

    notBusy();
    resultsEl().hidden = false;
    resultsEl().innerHTML =
      (notice ? '<p class="notice">' + escapeHtml(notice) + '</p>' + fixButtons(actions) : fixButtons([])) +
      '<div class="results-head"><h2>' + heading + '</h2>' +
      '<button type="button" class="chip" data-action="share">Copy link</button></div>' +
      '<p class="hint">' + LEAGUE_NAMES[state.league] + (own ? '' : ', ' + STYLE_HINTS[state.style]) + (state.noElite ? ', without Elite TM moves' : '') +
      '. Team score (out of 100) rates how well the team covers the top 100 Pokémon in ' + LEAGUE_NAMES[state.league] + '.' +
      (own ? ' Roles are set from each Pokémon’s PvPoke role scores.' : '') + '</p>' +
      (own ? '' : '<ol class="team-list">' + list + '</ol>') +
      '<div id="team-detail">' + renderDetail(described[state.selected]) + '</div>';
    // On a phone the results start below the fold, and a top team is opened from below them;
    // after a pick, bring them into view.
    if (revealResults) {
      revealResults = false;
      var top = resultsEl().getBoundingClientRect().top;
      if (top > window.innerHeight * 0.6 || top < 0) resultsEl().scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function ivChecker(m) {
    var saved = savedIvs(m.id);
    var labels = ['Attack', 'Defense', 'HP'];
    var inputs = labels.map(function (label, i) {
      return '<label><span>' + label.slice(0, 3) + '</span><input type="number" inputmode="numeric" min="0" max="15" step="1" ' +
        'data-iv="' + i + '" aria-label="' + label + ' IV" value="' + (saved ? saved[i] : '') + '"></label>';
    }).join('');
    return '<details class="ivcheck" data-id="' + escapeHtml(m.id) + '"' + (saved ? ' open' : '') + '>' +
      '<summary>Check your IVs</summary>' +
      '<div class="iv-inputs">' + inputs + '</div>' +
      '<p class="iv-result" aria-live="polite">' + ivResult(m.id, saved) + '</p></details>';
  }

  // Text for the IV checker, or a prompt when the spread is incomplete.
  function ivResult(id, ivs) {
    if (!ivs) return 'Enter Attack, Defense and HP (0–15).';
    var ctx = contexts[contextKey(state.league)];
    var r = window.Engine.ivCheck(ctx.byId[id].pokemon, LEAGUE_CP[state.league], ivs);
    if (!r) return 'These IVs can’t get under the ' + LEAGUE_NAMES[state.league] + ' CP cap.';
    return '<strong>Rank ' + r.rank + '</strong> of ' + r.of + ' · ' + r.percent.toFixed(1) + '% of rank 1' +
      '<br><small>Level ' + r.level + ' · CP ' + r.cp + '</small>';
  }

  function renderDetail(d) {
    var members = d.members.map(function (m, i) {
      var fast = m.moves[0], charged = m.moves.slice(1);
      function move(mv) {
        return '<li>' + (mv.type ? '<span class="type dot" data-type="' + escapeHtml(mv.type) + '" title="' + escapeHtml(capitalize(mv.type)) + '"></span>' : '') +
          escapeHtml(mv.name) + (mv.elite ? ' <abbr class="elite" title="Needs an Elite TM or a Community Day">Elite</abbr>' : '') +
          (mv.mega ? ' <abbr class="elite mega" title="Mega move: a third charged move this Mega has, with bonus damage">Mega</abbr>' : '') + '</li>';
      }
      // On a phone each member is one line (icon, name, role, moves) that opens to the full card.
      return '<article class="member">' +
        '<button type="button" class="member-line" aria-expanded="false" aria-controls="member-' + i + '">' + icon(m.id, 40) +
        '<span><span class="member-name">' + escapeHtml(m.name) + '</span> <span class="role">' + ROLE_NAMES[m.role] + '</span>' +
        '<small>' + escapeHtml(fast.name) + ' · ' + charged.map(function (mv) { return escapeHtml(mv.name); }).join(', ') + '</small></span>' +
        '<span class="chev" aria-hidden="true"></span></button>' +
        '<div class="member-body" id="member-' + i + '">' +
        '<div class="member-head">' + icon(m.id, 64) + '<div>' +
        '<p class="role">' + ROLE_NAMES[m.role] + ' <span class="role-note">' + ROLE_NOTES[m.role] + '</span></p>' +
        '<h3>' + escapeHtml(m.name) + '</h3>' +
        '<p class="types">' + typeChips(m.types) + '</p>' +
        '<p class="pvp-rank"><a href="https://pvpoke.com/rankings/' + LEAGUE_CUP[state.league] + '/' + LEAGUE_CP[state.league] + '/overall/' +
        encodeURIComponent(m.id) + '/" target="_blank" rel="noopener" title="Open in PvPoke">PvPoke #' + m.rank + '</a>' +
        ' <small>of ' + m.rankedCount + ' · score ' + m.rankScore.toFixed(1) + '</small></p>' +
        '</div></div>' +
        '<dl>' +
        '<dt>Fast move</dt><dd><ul class="moves">' + move(fast) + '</ul></dd>' +
        '<dt>Charged moves</dt><dd><ul class="moves">' + charged.map(move).join('') + '</ul></dd>' +
        (m.withoutElite.length ? '<dd class="swapped">Instead of ' + m.withoutElite.map(escapeHtml).join(', ') +
          ' <small>(Elite TM)</small></dd>' : '') +
        '<dt>Rank 1 IVs</dt><dd><span class="ivs" title="Attack / Defense / HP">' + m.ivs.atk + ' / ' + m.ivs.def + ' / ' + m.ivs.hp +
        '</span><br><small>Level ' + m.ivs.level + ' · CP ' + m.ivs.cp + '</small></dd>' +
        '</dl>' + ivChecker(m) + '</div></article>';
    }).join('');

    function threatList(items) {
      return '<ol class="threats">' + items.map(function (t) {
        return '<li>' + icon(t.id, 32) + '<div><span class="threat-name">' + escapeHtml(t.name) + '</span> ' + typeChips(t.types) +
          '<br><small>Best answer ' + escapeHtml(t.answer) + ': ' +
          '<span class="verdict" title="Battle rating ' + t.rating + ' (500 is even)">' + verdict(t.rating) + '</span></small></div></li>';
      }).join('') + '</ol>';
    }

    var shared = d.sharedWeaknesses.length
      ? '<p class="hint">Attack types that hit two or more of your Pokémon super-effectively, and which ones.</p>' +
        '<ul class="shared">' + d.sharedWeaknesses.map(function (w) {
          return '<li>' + typeChips([w.type]) + ' <span>' + englishList((w.names || []).map(escapeHtml)) +
            (w.count === 3 ? ' <small>(all three)</small>' : '') + '</span></li>';
        }).join('') + '</ul>'
      : '<p class="shared">No attack type hits two of your Pokémon super-effectively.</p>';

    var layoutNote = LAYOUT_NOTES[d.layout] ? 'Layout <strong>' + d.layout + '</strong>: ' + LAYOUT_NOTES[d.layout] + '.' : '';
    return '<div class="team-head">' +
      '<p class="team-figure" title="Team score out of 100"><b>' + d.displayScore + '</b><small>of 100</small></p>' +
      '<div><h3>' + d.members.map(function (m) { return escapeHtml(m.name); }).join(' · ') + '</h3>' +
      '<p class="coverage">Has a winning answer to <strong>' + d.beats + ' of the top ' + d.threatCount +
      '</strong> Pokémon in ' + LEAGUE_NAMES[state.league] + '.</p>' +
      (layoutNote ? '<p class="hint">' + layoutNote + '</p>' : '') +
      '<div class="team-actions">' + saveButton(d) + compareControl() + '</div></div></div>' +
      compareBlock(d) +
      metaGrid(d.meta) +
      pilotNotes(d) +
      '<div class="members">' + members + '</div>' +
      // The grid above shows every top-30 matchup; this names the three closest, which decide games.
      '<div class="report">' +
      '<section><h3>Closest matchups</h3><p class="hint">The top-30 threats your team has the hardest time with, even if it still wins them.</p>' +
      threatList(d.weaknesses) + '</section>' +
      '<section><h3>Shared weaknesses</h3>' + shared + '</section>' +
      '</div>';
  }

  // ---- How to play it: plain advice built from describeTeam().pilot (simulated matchups) ----

  // "a", "a and b", "a, b and c" (or "or" in place of "and").
  function englishList(items, word) {
    word = word || 'and';
    return items.length < 2 ? items.join('') : items.slice(0, -1).join(', ') + ' ' + word + ' ' + items[items.length - 1];
  }

  function nameList(items, word) {
    return englishList(items.map(function (t) { return escapeHtml(t.name); }), word || 'or');
  }

  function pilotNotes(d) {
    var p = d.pilot;
    if (!p) return '';   // a cached engine.js from before this feature
    var lead = d.members[0], swap = d.members[1], closer = d.members[2];
    var notes = [];
    notes.push('Lead with <strong>' + escapeHtml(lead.name) + '</strong>. On its own it wins ' + p.leadWins + ' of the top 30.');
    notes.push(p.switchFrom.length
      ? 'If they lead with ' + nameList(p.switchFrom) + ', switch to <strong>' + escapeHtml(swap.name) +
        '</strong> early: your lead loses ' + (p.switchFrom.length === 1 ? 'that one' : 'those') + ' and ' + escapeHtml(swap.name) + ' wins.'
      : 'Switch to <strong>' + escapeHtml(swap.name) + '</strong> when your lead is losing a matchup.');
    notes.push(p.closerOnly.length
      ? 'Keep <strong>' + escapeHtml(closer.name) + '</strong> for last: it’s your only win against ' +
        nameList(p.closerOnly, 'and') + '.'
      : 'Keep <strong>' + escapeHtml(closer.name) + '</strong> for last to finish the battle.');
    var counts = p.counts.map(function (c, k) {
      return c ? escapeHtml(d.members[k].name) + ': ' + escapeHtml(c.charged) + ' after ' + c.count + ' fast moves (' + escapeHtml(c.fast) + ')' : '';
    }).filter(Boolean);
    if (counts.length) notes.push('Count fast moves to know when your first charged move is ready: ' + counts.join('; ') + '.');
    // One line per shared weakness, naming the Pokémon it hits; at most two, worst first.
    d.sharedWeaknesses.slice(0, 2).forEach(function (w) {
      notes.push('Careful with ' + capitalize(w.type) + ' attacks: they hit ' + englishList((w.names || []).map(escapeHtml)) +
        ' super-effectively.');
    });
    // Open unless the viewer closed it; the choice is remembered (state.pilotHidden).
    return '<details class="pilot"' + (state.pilotHidden ? '' : ' open') + '><summary><h3>How to play it</h3></summary>' +
      '<ol>' + notes.map(function (n) { return '<li>' + n + '</li>'; }).join('') + '</ol>' +
      '<p class="hint">From simulated battles with one shield each, against the top 30 in ' + escapeHtml(LEAGUE_NAMES[state.league]) + '.</p></details>';
  }

  // "toggle" doesn't bubble, so listen in the capture phase. Chrome also fires it when an open
  // <details> is first drawn, possibly after the link has moved on, so only a real change is
  // stored, and only locally: touching the URL here could put back a link the viewer just left.
  resultsEl().addEventListener('toggle', function (ev) {
    if (!ev.target.classList || !ev.target.classList.contains('pilot')) return;
    if (state.pilotHidden === !ev.target.open) return;
    state.pilotHidden = !ev.target.open;
    saveLocal();
  }, true);

  // ---- Saved teams: kept on this device, reopened through their link ----

  function loadSaved() {
    try {
      var list = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      if (!Array.isArray(list)) return [];
      // Keep only well-formed entries; anything else is dropped rather than trusted.
      return list.filter(function (t) {
        return t && typeof t.hash === 'string' && /^#l=/.test(t.hash) && typeof t.league === 'string' &&
          Array.isArray(t.ids) && t.ids.length === 3 && t.ids.every(function (id) { return typeof id === 'string' && PICK_ID.test(id); }) &&
          Array.isArray(t.names) && t.names.length === 3 && t.names.every(function (n) { return typeof n === 'string'; }) &&
          typeof t.score === 'number' && typeof t.noElite === 'boolean';
      }).slice(0, MAX_SAVED);
    } catch (e) { return []; }
  }

  function storeSaved(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
  }

  // The same three Pokémon in the same format and Elite setting count as one saved team.
  function savedKey(league, noElite, ids) { return league + (noElite ? ':noelite' : '') + ':' + ids.slice().sort().join(','); }

  function savedIndex(d) {
    var key = savedKey(state.league, state.noElite, d.members.map(function (m) { return m.id; }));
    var list = loadSaved();
    for (var i = 0; i < list.length; i++) if (savedKey(list[i].league, list[i].noElite, list[i].ids) === key) return i;
    return -1;
  }

  function saveButton(d) {
    var saved = savedIndex(d) !== -1;
    return '<button type="button" class="chip" data-action="save-team" aria-pressed="' + saved + '">' +
      (saved ? 'Saved' : 'Save team') + '</button>';
  }

  function toggleSaved(d) {
    var list = loadSaved(), i = savedIndex(d);
    if (i !== -1) list.splice(i, 1);
    else {
      // The link reopens this exact view: the picks, the style, and this team selected.
      list.unshift({ hash: hashFor(Object.assign({}, state, { compare: null })), league: state.league, noElite: state.noElite,
        ids: d.members.map(function (m) { return m.id; }), names: d.members.map(function (m) { return m.name; }), score: d.displayScore });
    }
    storeSaved(list.slice(0, MAX_SAVED));
    renderSaved();
  }

  function renderSaved() {
    var list = loadSaved();
    var panel = document.getElementById('saved-teams');
    panel.hidden = !list.length;
    document.getElementById('saved-list').innerHTML = list.map(function (t, i) {
      var live = LEAGUES.indexOf(t.league) !== -1;
      var where = live ? escapeHtml(LEAGUE_NAMES[t.league]) + (t.noElite ? ', without Elite moves' : '')
        : 'A cup that is no longer in GO Battle League';
      return '<li class="saved' + (live ? '' : ' ended') + '">' +
        (live ? '<button type="button" class="saved-open" data-saved="' + i + '">' : '<div class="saved-open">') +
        '<span class="team-icons">' + t.ids.map(function (id) { return icon(id, 32); }).join('') + '</span>' +
        '<span class="saved-text"><span class="team-names">' + t.names.map(escapeHtml).join(' · ') + '</span>' +
        '<small>' + where + '</small></span>' +
        '<span class="team-score" title="Team score out of 100 when saved">' + t.score + '</span>' +
        (live ? '</button>' : '</div>') +
        '<button type="button" class="saved-remove" data-remove="' + i + '" aria-label="Remove ' + escapeHtml(t.names.join(', ')) + '">Remove</button></li>';
    }).join('');
  }

  document.getElementById('saved-list').addEventListener('click', function (ev) {
    var list = loadSaved();
    var remove = ev.target.closest('button[data-remove]');
    if (remove) {
      list.splice(Number(remove.dataset.remove), 1);
      storeSaved(list);
      renderSaved();
      refreshSaveButton();   // the open team may be the one just removed
      return;
    }
    var open = ev.target.closest('button[data-saved]');
    var t = open && list[Number(open.dataset.saved)];
    if (!t) return;
    revealResults = true;
    if (location.hash === t.hash) resultsEl().scrollIntoView({ behavior: 'smooth', block: 'start' });
    else location.hash = t.hash;   // the hashchange handler opens it, as for a pasted link
  });

  function refreshSaveButton() {
    var btn = resultsEl().querySelector('[data-action="save-team"]');
    var d = described[state.selected];
    if (btn && d) btn.outerHTML = saveButton(d);
  }

  // ---- Compare the selected team with another suggestion ----

  function teamLabel(i) {
    return '#' + (i + 1) + ' ' + described[i].members.map(function (m) { return m.name; }).join(' · ');
  }

  function compareControl() {
    if (described.length < 2) return '';
    var options = described.map(function (d, i) {
      if (i === state.selected) return '';
      return '<option value="' + i + '"' + (i === state.compare ? ' selected' : '') + '>' + escapeHtml(teamLabel(i)) + ' (' + d.displayScore + ')</option>';
    }).join('');
    return '<label class="compare">Compare with <select data-action="compare"><option value="">another team…</option>' + options + '</select></label>';
  }

  function tallyOf(meta) {
    var c = { win: 0, even: 0, loss: 0 };
    (meta || []).forEach(function (t) { c[band(t.rating)]++; });
    return c;
  }

  // Side by side: score, answers to the top 100, the top-30 tally, then the top-30 threats where
  // the two teams land in different bands (win / toss-up / loss).
  function compareBlock(d) {
    var o = state.compare === null ? null : described[state.compare];
    if (!o || !d.meta || !o.meta) return '';
    var a = tallyOf(d.meta), b = tallyOf(o.meta);
    var rank = { loss: 0, even: 1, win: 2 };
    var better = [], worse = [];
    d.meta.forEach(function (t, i) {
      var mine = band(t.rating), theirs = band(o.meta[i].rating);
      if (mine === theirs) return;
      var item = { t: t, i: i, mine: mine, theirs: theirs };
      (rank[mine] > rank[theirs] ? better : worse).push(item);
    });
    function row(label, x, y) {
      return '<tr><th scope="row">' + label + '</th><td>' + x + '</td><td>' + y + '</td></tr>';
    }
    var me = '#' + (state.selected + 1), them = '#' + (state.compare + 1);
    function diffList(title, items) {
      if (!items.length) return '';
      return '<div><h4>' + title + '</h4><ul class="diff-list">' + items.map(function (it) {
        return '<li>' + icon(it.t.id, 32) + '<span><strong>' + escapeHtml(it.t.name) + '</strong><br><small>' +
          me + ': ' + BAND_NAMES[it.mine] + ' · ' + them + ': ' + BAND_NAMES[it.theirs] + '</small></span></li>';
      }).join('') + '</ul></div>';
    }
    var mineLabel = '#' + (state.selected + 1) + '<br><small>this team</small>', theirLabel = '#' + (state.compare + 1);
    return '<section class="comparison" aria-label="Comparison with team ' + (state.compare + 1) + '">' +
      '<table><thead><tr><td></td><th scope="col">' + mineLabel + '</th><th scope="col">' + theirLabel + '</th></tr></thead><tbody>' +
      row('Team score', d.displayScore, o.displayScore) +
      row('Winning answers, top ' + d.threatCount, d.beats, o.beats) +
      row('Top 30: wins · toss-ups · losses', a.win + ' · ' + a.even + ' · ' + a.loss, b.win + ' · ' + b.even + ' · ' + b.loss) +
      '</tbody></table>' +
      (better.length || worse.length
        ? '<p class="hint">Top-30 Pokémon the two teams get different results against (the rest are the same):</p>' +
          '<div class="diffs">' + diffList(me + ' does better against', better) + diffList(them + ' does better against', worse) + '</div>'
        : '<p class="hint">Same results against every Pokémon in the top 30.</p>') +
      '</section>';
  }

  resultsEl().addEventListener('change', function (ev) {
    var select = ev.target.closest('select[data-action="compare"]');
    if (!select) return;
    state.compare = select.value === '' ? null : Number(select.value);
    save();
    document.getElementById('team-detail').innerHTML = renderDetail(described[state.selected]);
    var again = resultsEl().querySelector('select[data-action="compare"]');
    if (again) again.focus();
  });

  // The top 30 of the meta, each tinted by the team's best matchup against it. Tapping one names
  // the member that answers it in the note under the grid.
  function metaGrid(meta) {
    // A cached engine.js from before the grid (e.g. just after a deploy) has no meta: skip the grid.
    if (!meta || !meta.length) return '';
    var count = { win: 0, even: 0, loss: 0 };
    meta.forEach(function (t) { count[band(t.rating)]++; });
    function tally(b, one, many) {
      return '<span class="tally ' + b + '"><span class="swatch"></span>' + count[b] + ' ' + (count[b] === 1 ? one : many) + '</span>';
    }
    return '<section class="meta" aria-labelledby="meta-title">' +
      '<div class="meta-head"><h3 id="meta-title">Against the top ' + meta.length + '</h3>' +
      '<p class="meta-tally">' + tally('win', 'win', 'wins') + tally('even', 'toss-up', 'toss-ups') + tally('loss', 'loss', 'losses') + '</p></div>' +
      '<ol class="meta-grid">' + meta.map(function (t, i) {
        var b = band(t.rating);
        return '<li><button type="button" class="meta-cell ' + b + '" data-meta="' + i + '" aria-pressed="false" aria-label="#' + (i + 1) + ' ' +
          escapeHtml(t.name) + ': ' + BAND_NAMES[b] + '" title="#' + (i + 1) + ' ' + escapeHtml(t.name) + '">' +
          icon(t.id, 40) + '<span class="meta-rank">' + (i + 1) + '</span></button></li>';
      }).join('') + '</ol>' +
      '<p class="meta-note" aria-live="polite">Tap a Pokémon to see your best answer to it.</p></section>';
  }

  function metaNote(t, i) {
    return '<strong>#' + (i + 1) + ' ' + escapeHtml(t.name) + '</strong> ' + typeChips(t.types) + ' · best answer ' +
      escapeHtml(t.answer) + ': <span class="verdict" title="Battle rating ' + t.rating + ' (500 is even)">' + verdict(t.rating) + '</span>';
  }

  function copyLink(btn) {
    save();
    var url = location.href;
    function done(text) {
      btn.textContent = text;
      setTimeout(function () { btn.textContent = 'Copy link'; }, 2000);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done('Link copied'); }, function () { window.prompt('Copy this link:', url); });
    } else {
      window.prompt('Copy this link:', url);
    }
  }

  resultsEl().addEventListener('click', function (ev) {
    var share = ev.target.closest('button[data-action="share"]');
    if (share) { copyLink(share); return; }
    var line = ev.target.closest('button.member-line');
    if (line) {
      var open = line.getAttribute('aria-expanded') !== 'true';
      line.setAttribute('aria-expanded', String(open));
      line.closest('.member').classList.toggle('open', open);
      return;
    }
    var fix = ev.target.closest('button[data-fix]');
    if (fix) {
      var f = fixes[Number(fix.dataset.fix)];
      if (f) f.run();
      return;
    }
    if (ev.target.closest('button[data-action="save-team"]') && described[state.selected]) {
      toggleSaved(described[state.selected]);
      refreshSaveButton();
      var again = resultsEl().querySelector('[data-action="save-team"]');
      if (again) again.focus();
      return;
    }
    var cell = ev.target.closest('button[data-meta]');
    var d = described[state.selected];
    if (cell && d && d.meta) {
      var i = Number(cell.dataset.meta);
      Array.prototype.forEach.call(resultsEl().querySelectorAll('.meta-cell'), function (c) {
        c.setAttribute('aria-pressed', String(c === cell));
      });
      resultsEl().querySelector('.meta-note').innerHTML = metaNote(d.meta[i], i);
      return;
    }
    var btn = ev.target.closest('button[data-team]');
    if (!btn || !described[Number(btn.dataset.team)]) return;
    state.selected = Number(btn.dataset.team);
    if (state.compare === state.selected) state.compare = null;
    save();
    Array.prototype.forEach.call(resultsEl().querySelectorAll('.team-option'), function (b) {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    document.getElementById('team-detail').innerHTML = renderDetail(described[state.selected]);
  });

  resultsEl().addEventListener('input', function (ev) {
    var input = ev.target.closest('input[data-iv]');
    if (!input) return;
    var box = input.closest('.ivcheck');
    var values = Array.prototype.map.call(box.querySelectorAll('input[data-iv]'), function (el) {
      return el.value === '' ? NaN : Number(el.value);
    });
    var valid = values.every(function (n) { return n === Math.floor(n) && n >= 0 && n <= 15; });
    if (valid) saveIvs(box.dataset.id, values);
    else if (values.every(isNaN)) saveIvs(box.dataset.id, null);
    // Only the result line is rewritten, so the input keeps focus and caret.
    box.querySelector('.iv-result').innerHTML = valid ? ivResult(box.dataset.id, values)
      : values.some(function (n) { return !isNaN(n) && (n !== Math.floor(n) || n < 0 || n > 15); })
        ? 'Each IV is a whole number from 0 to 15.' : ivResult(box.dataset.id, null);
  });

  // ---- Top teams banner: the best teams built from scratch in the current league, with no typing rule ----

  function renderTopTeams() {
    var id = ++topRunId;
    var league = state.league;
    var key = contextKey(league);
    var hint = document.getElementById('top-teams-hint');
    var list = document.getElementById('top-list');
    document.getElementById('top-teams-title').textContent = 'Top ' + LEAGUE_NAMES[league] + ' teams';
    if (!topTeams[key]) {
      hint.textContent = 'Ranking teams…';
      list.innerHTML = '';
    }
    contextFor(league).then(function (ctx) {
      if (id !== topRunId) return;
      // Like runSearch: let the message paint before the search blocks the main thread.
      setTimeout(function () {
        if (id !== topRunId) return;
        if (!topTeams[key]) topTeams[key] = window.Engine.bestTeams(ctx, 'any', TOP_COUNT);
        hint.textContent = 'The highest-scoring teams of any typing' + (state.noElite ? ' without Elite TM moves' : '') +
          ' from the top 50 Pokémon in ' + LEAGUE_NAMES[league] + '. Open one to see its moves and IVs.';
        list.innerHTML = topTeams[key].map(function (t, i) {
          var d = window.Engine.describeTeam(ctx, t);
          return '<li><button type="button" class="top-team" data-top="' + i + '">' +
            '<span class="team-rank">' + (i + 1) + '</span>' +
            '<span class="team-icons">' + d.members.map(function (m) { return icon(m.id, 32); }).join('') + '</span>' +
            '<span><span class="layout" title="Typing layout (lead / safe swap / closer)">' + d.layout + '</span> ' +
            '<span class="team-score" title="Team score out of 100">' + d.displayScore + '</span></span>' +
            '<span class="team-names">' + d.members.map(function (m) { return escapeHtml(m.name); }).join(' · ') + '</span>' +
            '</button></li>';
        }).join('');
      }, 30);
    }).catch(function () {
      if (id === topRunId) hint.textContent = 'Could not load ' + LEAGUE_NAMES[league] + ' data.';
    });
  }

  // Opens a banner team: its lead and safe swap become the picks, and the results select the
  // suggestion with its closer (Engine tests check it is among them). The team style stays unless
  // the team doesn't fit it, in which case it switches to Best score so the team can be shown.
  document.getElementById('top-list').addEventListener('click', function (ev) {
    var btn = ev.target.closest('button[data-top]');
    var team = btn && (topTeams[contextKey(state.league)] || [])[Number(btn.dataset.top)];
    if (!team) return;
    if (!window.Engine.assignRoles(team.members, state.style)) state.style = 'any';
    state.picks = [team.members[0].id, team.members[1].id, null];
    state.selected = 0;
    state.compare = null;
    openThird = team.members[2].id;
    save();
    syncRadios();
    syncCombos();
    renderQuickPicks();
    revealResults = true;
    runSearch();
  });

  // ---- League picker, from the GO Battle League schedule ----

  function liveWeek(weeks) {
    for (var i = 0; i < weeks.length; i++) if (weeks[i][0] <= NOW && NOW < weeks[i][1]) return weeks[i];
    return null;
  }

  function shortDate(ms) {
    return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function leagueChip(f, status) {
    return '<label' + (f.rules ? ' title="' + escapeHtml(f.rules) + '"' : '') + '><input type="radio" name="league" value="' +
      escapeHtml(f.id) + '"> ' + escapeHtml(f.name.replace(/ League\b/, '')) + ' <small>' + escapeHtml(f.label) + '</small>' +
      (status || '') + '</label>';
  }

  // Three groups, in this order: live in GBL this week, always available, and starting within a week.
  // League colour as the page accent, like the game: Great blue, Ultra gold, Master purple. Cups
  // with their own rules get a neutral accent; the open Mega formats follow their CP cap.
  function applyAccent() {
    var f = FORMATS.filter(function (x) { return x.id === state.league; })[0];
    var family = !f ? 'great' : f.cup !== 'all' && f.cup !== 'mega' ? 'cup'
      : f.cp <= 1500 ? 'great' : f.cp <= 2500 ? 'ultra' : 'master';
    document.documentElement.dataset.league = family;
  }

  function renderLeagueOptions() {
    var live = [], always = [], soon = [], until = null;
    FORMATS.forEach(function (f) {
      var w = liveWeek(f.weeks);
      if (w) { live.push(f); until = w[1]; }
      else if (f.cup === 'all') always.push(f);
      else soon.push(f);
    });
    function group(name, items, chip) {
      if (!items.length) return '';
      return '<div class="league-group" role="group" aria-label="' + escapeHtml(name) + '"><span class="group-label">' +
        escapeHtml(name) + '</span>' + items.map(chip).join('') + '</div>';
    }
    document.getElementById('league-options').innerHTML =
      group(until ? 'Live until ' + shortDate(until) : 'Live', live, function (f) { return leagueChip(f); }, 'live') +
      group(live.length ? 'Always' : 'Leagues', always, function (f) { return leagueChip(f); }) +
      group('Coming up', soon, function (f) {
        var next = f.weeks.filter(function (w) { return w[0] > NOW; })[0];
        return leagueChip(f, next ? '<span class="status soon">' + escapeHtml(shortDate(next[0])) + '</span>' : '');
      });

    // Live GBL formats the site can't offer (no PvPoke rankings), so the week's line-up is complete.
    var note = document.getElementById('gbl-week');
    var missing = FORMAT_DATA.other.filter(function (f) { return liveWeek(f.weeks); }).map(function (f) { return escapeHtml(f.name); });
    note.hidden = !missing.length;
    note.innerHTML = missing.length ? 'Also live in GO Battle League: ' + missing.join(', ') + ' (no public rankings to build from).' : '';
  }

  // Scrolls the league row (phone: one sideways row) so the selected format is in view.
  function revealLeague() {
    var row = document.getElementById('league-options');
    var chip = row.querySelector('input:checked');
    if (!chip || row.scrollWidth <= row.clientWidth) return;
    // Offsets are relative to .league-row (its offsetParent). Stay at the start if the chip shows
    // there, else start at its group, else at the chip itself.
    var label = chip.parentNode, right = label.offsetLeft + label.offsetWidth;
    var groupStart = Math.max(0, label.parentNode.offsetLeft - 16);
    row.scrollLeft = right <= row.clientWidth ? 0
      : right - groupStart <= row.clientWidth ? groupStart : Math.max(0, label.offsetLeft - 16);
  }

  // ---- Form wiring ----

  function renderDataDate() {
    window.PvpData.gamemaster().then(function (gm) {
      document.getElementById('data-date').textContent = ', game data of ' + gm.timestamp.slice(0, 10);
    }).catch(function () { /* the results panel reports load errors */ });
    // How far ahead the schedule is known: if this date passes, the schedule source has gone stale.
    var schedule = FORMAT_DATA.schedule;
    if (schedule && /^[\w.-]+\/[\w.-]+$/.test(schedule.source)) {
      var source = document.getElementById('schedule-source');
      source.textContent = schedule.source;
      source.href = 'https://github.com/' + schedule.source;
      document.getElementById('schedule-end').textContent = ', known through ' +
        new Date(schedule.end).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
      document.getElementById('schedule-credit').hidden = false;
    }
  }

  function syncRadios() {
    ['league', 'style'].forEach(function (field) {
      Array.prototype.forEach.call(document.querySelectorAll('input[name="' + field + '"]'), function (input) {
        input.checked = input.value === state[field];
      });
    });
    document.getElementById('use-elite').checked = !state.noElite;
  }

  // A shared link pasted into an already open tab.
  window.addEventListener('hashchange', function () {
    var shared = readHash();
    if (!shared || location.hash === hashFor(state)) return;
    applySaved(state, { league: shared.league, style: shared.style, picks: shared.picks.concat([null, null]), selected: shared.selected, noElite: shared.noElite, compare: shared.compare });
    save();
    syncRadios();
    revealLeague();
    applyAccent();
    syncCombos();
    renderQuickPicks();
    runSearch();
    renderTopTeams();
  });

  function bindRadios(name, field, onChange) {
    var inputs = document.querySelectorAll('input[name="' + name + '"]');
    Array.prototype.forEach.call(inputs, function (input) {
      input.checked = input.value === state[field];
      input.addEventListener('change', function () {
        if (!input.checked) return;
        var previous = state[field];
        state[field] = input.value;
        state.selected = 0;
        state.compare = null;
        save();
        if (onChange) onChange(previous);
      });
    });
  }

  function bindTheme() {
    var select = document.getElementById('theme');
    select.value = window.Theme.get();
    select.addEventListener('change', function () { window.Theme.set(select.value); });
  }

  // "Use Elite moves" is the positive form of state.noElite (on by default).
  var useElite = document.getElementById('use-elite');
  useElite.checked = !state.noElite;
  useElite.addEventListener('change', function () {
    state.noElite = !useElite.checked;
    state.selected = 0;
    state.compare = null;
    save();
    runSearch();
    renderTopTeams();
  });

  renderLeagueOptions();
  bindRadios('league', 'league', function (previous) {
    leagueUndo = { league: previous, picks: state.picks.slice() };
    applyAccent(); syncCombos(); renderQuickPicks(); runSearch(); renderTopTeams(); });
  revealLeague();
  applyAccent();
  bindRadios('style', 'style', function () { runSearch(); });
  bindTheme();
  renderDataDate();
  // Rewrite an old or non-canonical shared link (e.g. a merged style like s=abb) to its current form.
  if (location.hash && hashFor(state) && location.hash !== hashFor(state)) {
    history.replaceState(null, '', hashFor(state));
  }
  runSearch(startNotice);
  renderTopTeams();
  // Saved teams show their icons, so wait for the image map.
  window.PvpData.images().then(function (map) { images = map; renderSaved(); }, function () { renderSaved(); });
})();
