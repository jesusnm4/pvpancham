// Tests for js/engine.js. Unit tests use inline fixtures; integration tests run against the PvPoke
// snapshot when data/*.js is loaded (tests.html and scripts/run-tests.js both load it).
(function () {
  var E = window.Engine;
  var results = [];
  window.EngineTests = { results: results };

  function test(name, fn) {
    try {
      fn();
    } catch (e) {
      results.push({ name: name, pass: false, detail: 'threw: ' + (e && e.message) });
    }
  }

  function ok(name, cond, detail) {
    results.push({ name: name, pass: !!cond, detail: detail || '' });
  }

  function close(name, actual, expected, tol) {
    tol = tol === undefined ? 1e-9 : tol;
    ok(name, Math.abs(actual - expected) <= tol, 'got ' + actual + ', expected ' + expected);
  }

  function eq(name, actual, expected) {
    var a = JSON.stringify(actual), b = JSON.stringify(expected);
    ok(name, a === b, 'got ' + a + ', expected ' + b);
  }

  function throws(name, fn) {
    try { fn(); ok(name, false, 'did not throw'); } catch (e) { ok(name, true, e.message); }
  }

  // ---- Fixtures ----

  var MOVES = {
    TACKLE: { moveId: 'TACKLE', name: 'Tackle', type: 'normal', power: 5, energy: 0, energyGain: 5, turns: 1 },
    BLAST: { moveId: 'BLAST', name: 'Blast', type: 'normal', power: 90, energy: 50, energyGain: 0, turns: 1 },
    WEAK_BLAST: { moveId: 'WEAK_BLAST', name: 'Weak Blast', type: 'normal', power: 45, energy: 50, energyGain: 0, turns: 1 },
    POWER_UP: { moveId: 'POWER_UP', name: 'Power Up', type: 'normal', power: 45, energy: 50, energyGain: 0, turns: 1,
      buffs: [2, 0], buffTarget: 'self', buffApplyChance: '1' },
    LUCKY_UP: { moveId: 'LUCKY_UP', name: 'Lucky Up', type: 'normal', power: 45, energy: 50, energyGain: 0, turns: 1,
      buffs: [2, 0], buffTarget: 'self', buffApplyChance: '.1' }
  };

  function mon(id, types, stats, extra) {
    var p = { id: id, name: id, dex: id.length, types: types, stats: stats, fast: [], charged: [] };
    for (var k in extra || {}) p[k] = extra[k];
    return p;
  }

  function battler(p, moveset) { return E.makeBattler(p, moveset, 'great', MOVES); }

  // ---- Type chart ----

  test('type chart', function () {
    close('fighting vs normal is super effective', E.effectiveness('fighting', ['normal']), 1.60000002384185791015625);
    close('ghost vs normal is double resisted', E.effectiveness('ghost', ['normal']), 0.390625);
    close('electric vs water/flying stacks', E.effectiveness('electric', ['water', 'flying']), Math.pow(1.60000002384185791015625, 2));
    close('super effective and resisted cancel', E.effectiveness('fire', ['grass', 'water']), 1.60000002384185791015625 * 0.625);
    close('dragon vs fairy is double resisted', E.effectiveness('dragon', ['fairy']), 0.390625);
    eq('steel weaknesses', E.weaknesses(['steel']), ['fighting', 'ground', 'fire']);
    eq('water/ground has one weakness', E.weaknesses(['water', 'ground']), ['grass']);
    ok('super effective times resisted is neutral', !E.isSuperEffective('water', ['water', 'ground']));
  });

  // ---- CP and IVs ----

  test('CP formula matches known in-game values', function () {
    var mewtwo = [300, 182, 214];
    eq('Mewtwo 15/15/15 level 40', E.cpFor(mewtwo, [15, 15, 15], E.cpmAt(40)), 4178);
    eq('Mewtwo 15/15/15 level 50', E.cpFor(mewtwo, [15, 15, 15], E.cpmAt(50)), 4724);
    eq('CP never drops below 10', E.cpFor([10, 10, 10], [0, 0, 0], E.cpmAt(1)), 10);
  });

  test('IV floors', function () {
    eq('ordinary Pokémon', E.ivFloor(mon('a', ['normal'], [1, 1, 1])), 0);
    eq('traded legendary', E.ivFloor(mon('a', ['normal'], [1, 1, 1], { tags: ['legendary'] })), 1);
    eq('wild-catchable legendary', E.ivFloor(mon('a', ['normal'], [1, 1, 1], { tags: ['legendary', 'wildlegendary'] })), 0);
    eq('shadow legendary', E.ivFloor(mon('a', ['normal'], [1, 1, 1], { tags: ['legendary', 'shadow'] })), 6);
    eq('untradeable', E.ivFloor(mon('a', ['normal'], [1, 1, 1], { tags: ['mythical', 'untradeable'] })), 10);
  });

  test('IV ranking', function () {
    var altaria = mon('altaria', ['dragon', 'flying'], [141, 201, 181]);
    var ranking = E.ivRanking(altaria, 1500);
    var r1 = ranking[0];
    eq('Altaria Great League rank 1 is 0/14/15 at level 29', [r1.ivs, r1.level], [[0, 14, 15], 29]);
    ok('every spread fits under the cap', ranking.every(function (r) { return r.cp <= 1500; }));
    ok('sorted by stat product', ranking.every(function (r, i) { return i === 0 || ranking[i - 1].statProduct >= r.statProduct; }));
    eq('all 4096 spreads ranked', ranking.length, 4096);

    var legendary = mon('leg', ['psychic'], [200, 200, 200], { tags: ['legendary'] });
    ok('floor excludes 0 IVs', E.ivRanking(legendary, 1500).every(function (r) { return Math.min.apply(null, r.ivs) >= 1; }));

    var master = E.rankOne(mon('mewtwo', ['psychic'], [300, 182, 214]), 'master');
    eq('Master League rank 1 is hundo at level 50', [master.ivs, master.level, master.cp], [[15, 15, 15], 50, 4724]);

    var check = E.ivCheck(altaria, 'great', [0, 14, 15]);
    eq('IV check: rank 1 spread', [check.rank, check.of, Math.round(check.percent * 100) / 100, check.level], [1, 4096, 100, 29]);
    var hundo = E.ivCheck(altaria, 'great', [15, 15, 15]);
    ok('IV check: 15/15/15 ranks below rank 1', hundo.rank > 1 && hundo.percent < 100 && hundo.cp <= 1500, JSON.stringify(hundo));
    eq('IV check: rank matches the full ranking', hundo.rank,
      1 + ranking.filter(function (r) { return r.statProduct > ranking[hundo.rank - 1].statProduct + 1e-9; }).length);
    var below = E.ivCheck(legendary, 'great', [0, 0, 0]);
    ok('IV check: a spread below the IV floor is still rated', below && below.rank >= 1 && below.of === 15 * 15 * 15, JSON.stringify(below));
    eq('IV check: Master League ranks at level 50', E.ivCheck(mon('mewtwo', ['psychic'], [300, 182, 214]), 'master', [15, 15, 15]).rank, 1);
    throws('IV check: rejects out-of-range IVs', function () { E.ivCheck(altaria, 'great', [16, 0, 0]); });
    throws('IV check: rejects fractional IVs', function () { E.ivCheck(altaria, 'great', [1.5, 0, 0]); });

    var tooBig = mon('big', ['normal'], [500, 500, 500], { levelFloor: 20 });
    eq('Pokémon that cannot fit the cap has no rank 1', E.rankOne(tooBig, 'great'), null);

    // Cups are passed by their CP cap.
    eq('a CP cap works like the league id', E.rankOne(altaria, 1500), E.rankOne(altaria, 'great'));
    eq('a no-cap number works like Master League', E.rankOne(mon('mewtwo', ['psychic'], [300, 182, 214]), 10000).ivs, [15, 15, 15]);
    ok('a 500 CP cup fits under its cap', E.rankOne(altaria, 500).cp <= 500, E.rankOne(altaria, 500).cp);
    throws('an unknown league id is rejected', function () { E.rankOne(altaria, 'fantasy'); });
  });

  // ---- Battle ----

  test('damage formula', function () {
    var a = { types: ['normal'], atk: 100, def: 100 };
    var b = { types: ['fire'], atk: 100, def: 100 };
    // floor(10 * 1.2 STAB * 1 * 0.5 * 1.3) + 1 = floor(7.8) + 1
    eq('STAB neutral hit', E.damage(a, b, { type: 'normal', power: 10 }), 8);
    // floor(10 * 1 * 1.6 * 0.5 * 1.3) + 1 = floor(10.4) + 1
    eq('super-effective non-STAB hit', E.damage(a, b, { type: 'water', power: 10 }), 11);
    eq('minimum damage is 1', E.damage(a, { types: ['ghost'], def: 100 }, { type: 'normal', power: 1 }), 1);
  });

  test('Megas', function () {
    var plus = { moveId: 'BLAST_PLUS', type: 'fire', power: 100, energy: 50, energyGain: 0, isMegaMove: true };
    var target = { types: ['normal'], def: 100 };
    // floor(100 * 1 * 0.5 * 1.3 * bonus) + 1, bonus by Mega level: 3 -> 1.2, 4 -> 1.3. The game's
    // 1.3 is 1.29999995, so the plain hit floors 64.99... to 64.
    eq('no bonus for a non-Mega', E.damage({ types: ['normal'], atk: 100, megaLevel: 0 }, target, plus), 65);
    eq('Mega move: x1.2 at Mega level 3', E.damage({ types: ['normal'], atk: 100, megaLevel: 3 }, target, plus), 79);
    eq('Mega move: x1.3 at Mega level 4', E.damage({ types: ['normal'], atk: 100, megaLevel: 4 }, target, plus), 85);
    var ordinary = { type: 'fire', power: 100 };
    eq('ordinary moves get no Mega bonus', E.damage({ types: ['normal'], atk: 100, megaLevel: 4 }, target, ordinary), 65);

    var mega = mon('mega', ['normal'], [300, 182, 214], { tags: ['mega'] });
    var superMega = mon('super', ['normal'], [300, 182, 214], { tags: ['mega', 'supermega'] });
    eq('Megas battle at Mega level 3', battler(mega, ['TACKLE', 'BLAST']).megaLevel, 3);
    eq('supermegas battle at Mega level 4', battler(superMega, ['TACKLE', 'BLAST']).megaLevel, 4);
    eq('Megas cap at level 50 in Master League', E.rankOne(mega, 'master').level, 50);
    eq('supermegas reach level 52 in Master League', E.rankOne(superMega, 'master').level, 52);
    var small = mon('small', ['normal'], [90, 90, 90], { tags: ['mega', 'supermega'] });
    ok('supermegas can go past level 50 under a CP cap', E.rankOne(small, 'great').level > 50, E.rankOne(small, 'great').level);
  });

  test('simulator', function () {
    var strong = battler(mon('strong', ['normal'], [220, 180, 180]), ['TACKLE', 'BLAST']);
    var weak = battler(mon('weak', ['normal'], [90, 90, 90]), ['TACKLE', 'BLAST']);
    ok('stronger Pokémon wins', E.simulate(strong, weak, 1, 1) > 500, E.simulate(strong, weak, 1, 1));
    ok('weaker Pokémon loses', E.simulate(weak, strong, 1, 1) < 500, E.simulate(weak, strong, 1, 1));
    var r = E.simulate(strong, weak, 0, 0);
    ok('rating stays within 0-1000', r >= 0 && r <= 1000, r);
    ok('extra shields never hurt', E.simulate(weak, strong, 2, 0) >= E.simulate(weak, strong, 0, 0),
      E.simulate(weak, strong, 2, 0) + ' vs ' + E.simulate(weak, strong, 0, 0));
    var mirror = E.simulate(strong, strong, 1, 1);
    ok('mirror match is close to even', mirror > 350 && mirror < 650, mirror);
    close('matchup averages the three shield scenarios', E.matchup(strong, weak),
      Math.round((E.simulate(strong, weak, 0, 0) + E.simulate(strong, weak, 1, 1) + E.simulate(strong, weak, 2, 2)) / 3), 0);

    var foe = battler(mon('foe', ['normal'], [160, 160, 160]), ['TACKLE', 'BLAST']);
    var hero = mon('hero', ['normal'], [160, 160, 160]);
    var plain = E.simulate(battler(hero, ['TACKLE', 'WEAK_BLAST']), foe, 0, 0);
    var buffed = E.simulate(battler(hero, ['TACKLE', 'POWER_UP']), foe, 0, 0);
    var chance = E.simulate(battler(hero, ['TACKLE', 'LUCKY_UP']), foe, 0, 0);
    ok('guaranteed self buff helps', buffed > plain, buffed + ' vs ' + plain);
    eq('chance-based buffs are ignored', chance, plain);

    var disguised = mon('mimic', ['normal'], [160, 160, 160],
      { formChange: { trigger: 'charged_move_damage', effect: 'protect', alternativeStatBuffs: [0, -1] } });
    var withDisguise = E.simulate(battler(disguised, ['TACKLE', 'BLAST']), foe, 0, 0);
    var without = E.simulate(battler(hero, ['TACKLE', 'BLAST']), foe, 0, 0);
    ok('Disguise blocks a charged move', withDisguise > without, withDisguise + ' vs ' + without);
  });

  // ---- Teams ----

  function entry(id, types, roles) {
    return { id: id, pokemon: mon(id, types, [1, 1, 1]), ranking: { roles: roles, score: 90 } };
  }

  test('team styles and roles', function () {
    var water = entry('water', ['water'], [90, 50, 50]);
    var water2 = entry('water2', ['water', 'ice'], [50, 90, 50]);
    var grass = entry('grass', ['grass'], [50, 50, 90]);
    var fire = entry('fire', ['fire'], [50, 90, 50]);

    var abc = E.assignRoles([water, grass, fire], 'abc');
    eq('ABC puts each Pokémon in its best role', abc.map(function (e) { return e.id; }), ['water', 'grass', 'fire']);
    eq('ABC rejects a shared type', E.assignRoles([water, water2, grass], 'abc'), null);

    var aba = E.assignRoles([water, water2, grass], 'aba');
    ok('ABA: lead and closer share a type', aba && aba[0].pokemon.types[0] === 'water' && aba[2].pokemon.types[0] === 'water');
    eq('ABA: safe swap is the odd one out', aba && aba[1].id, 'grass');

    var abb = E.assignRoles([water, water2, grass], 'abb');
    eq('ABB: lead is the odd one out', abb && abb[0].id, 'grass');
    eq('ABB needs a shared type', E.assignRoles([water, grass, fire], 'abb'), null);
    ok('Any accepts anything', E.assignRoles([water, water2, grass], 'any') !== null);

    var pair = E.assignRoles([water, water2, grass], 'pair');
    ok('Shared type accepts an ABB or ABA order', pair && ['ABB', 'ABA'].indexOf(E.layoutOf(pair)) !== -1, pair && E.layoutOf(pair));
    var best = ['abb', 'aba'].map(function (st) { return E.assignRoles([water, water2, grass], st); })
      .sort(function (x, y) {
        function roleScore(t) { return t[0].ranking.roles[0] + t[1].ranking.roles[2] + t[2].ranking.roles[1]; }
        return roleScore(y) - roleScore(x);
      })[0];
    eq('Shared type keeps the better of the two orders', pair.map(function (e) { return e.id; }), best.map(function (e) { return e.id; }));
    eq('Shared type rejects three distinct typings', E.assignRoles([water, grass, fire], 'pair'), null);
    eq('Shared type rejects a type shared by all three', E.assignRoles([water, water2, entry('water3', ['water'], [1, 1, 1])], 'pair'), null);
    eq('layout ABC', E.layoutOf([water, grass, fire]), 'ABC');
    eq('layout ABA', E.layoutOf([water, grass, water2]), 'ABA');
    eq('layout ABB', E.layoutOf([grass, water, water2]), 'ABB');
    eq('layout AAB', E.layoutOf([water, water2, grass]), 'AAB');
  });

  test('shared weaknesses', function () {
    var list = [mon('a', ['steel'], [1, 1, 1]), mon('b', ['steel', 'ice'], [1, 1, 1]), mon('c', ['rock'], [1, 1, 1])];
    var shared = E.sharedWeaknesses(list);
    eq('fighting hits all three', shared[0], { type: 'fighting', count: 3, names: list.map(function (p) { return p.name; }) });
    ok('each type names exactly the Pokémon it hits', shared.every(function (s) {
      return s.names.length === s.count && s.names.every(function (n) {
        var p = list.filter(function (x) { return x.name === n; })[0];
        return p && E.isSuperEffective(s.type, p.types);
      });
    }));
    eq('types hitting two or more', shared.map(function (s) { return s.type; }).sort(),
      ['fighting', 'fire', 'ground', 'steel', 'water'].filter(function (t) {
        return list.filter(function (p) { return E.isSuperEffective(t, p.types); }).length >= 2;
      }).sort());
  });

  // ---- Integration with the PvPoke snapshot ----

  var raw = window.PvpData && window.PvpData.raw;
  if (!raw || !raw.gamemaster) {
    ok('integration tests skipped: data/*.js not loaded', true);
    return;
  }

  function index(list, key) {
    var map = {};
    list.forEach(function (x) { map[x[key]] = x; });
    return map;
  }
  var gm = { pokemonById: index(raw.gamemaster.pokemon, 'id'), movesById: index(raw.gamemaster.moves, 'moveId') };
  // Formats on offer, from data/formats.js (the open leagues plus any cup in the GBL schedule).
  var formats = raw.formats.formats;

  test('formats data', function () {
    eq('the open leagues come first', formats.slice(0, 3).map(function (f) { return [f.id, f.cp, f.cup]; }),
      [['great', 1500, 'all'], ['ultra', 2500, 'all'], ['master', 10000, 'all']]);
    ok('format ids are safe file and hash names', formats.every(function (f) { return /^[a-z0-9_]{1,32}$/.test(f.id); }));
    ok('every format has a name, label and CP cap', formats.every(function (f) { return f.name && f.label && f.cp > 0; }));
    ok('weeks run forwards', formats.concat(raw.formats.other).every(function (f) {
      return f.weeks.every(function (w) { return w[0] < w[1]; });
    }));
    ok('every cup is scheduled', formats.slice(3).every(function (f) { return f.weeks.length > 0; }));
    var sched = raw.formats.schedule;
    ok('the schedule end covers every week', !sched || formats.concat(raw.formats.other).every(function (f) {
      return f.weeks.every(function (w) { return w[1] <= sched.end; });
    }));
  });

  formats.forEach(function (f) {
    var league = f.id;
    test(f.name + ' with real data', function () {
      var ctx = E.createContext(gm, raw['rankings-' + league], f.cp);
      var cap = f.cp;
      // Cups can rank fewer Pokémon than the open leagues' 100-strong meta.
      ok(league + ': 100 threats', ctx.threats.length === 100 || (f.cup !== 'all' && ctx.threats.length >= 30), ctx.threats.length);

      var pick = ctx.ranked[0].id;
      var teams = E.suggest(ctx, [pick], 'abc', 5);
      eq(league + ': five suggestions', teams.length, 5);
      ok(league + ': every team includes the pick', teams.every(function (t) {
        return t.members.some(function (m) { return m.id === pick; });
      }));
      ok(league + ': no duplicate species', teams.every(function (t) {
        var dex = t.members.map(function (m) { return m.pokemon.dex; });
        return dex[0] !== dex[1] && dex[0] !== dex[2] && dex[1] !== dex[2];
      }));
      ok(league + ': teams fit ABC', teams.every(function (t) { return E.assignRoles(t.members, 'abc') !== null; }));
      var paired = E.suggest(ctx, [pick], 'pair', 5);
      ok(league + ': shared-type teams are ABB or ABA', paired.length > 0 && paired.every(function (t) {
        return ['ABB', 'ABA'].indexOf(E.describeTeam(ctx, t).layout) !== -1;
      }), paired.map(function (t) { return E.layoutOf(t.members); }).join(' '));
      if (f.megas) {
        var megaCount = function (t) { return t.members.filter(function (m) { return m.pokemon.tags && m.pokemon.tags.indexOf('mega') !== -1; }).length; };
        var megas = ctx.ranked.filter(function (e) { return e.pokemon.tags && e.pokemon.tags.indexOf('mega') !== -1; });
        ok(league + ': at most one Mega per suggested team, picked or not',
          megas.length < 2 || E.suggest(ctx, [megas[0].id], 'any', 5).concat(E.suggest(ctx, [ctx.ranked[0].id], 'any', 5))
            .every(function (t) { return megaCount(t) <= 1; }));
        ok(league + ': at most one Mega in the top teams', E.bestTeams(ctx, 'any', 3).every(function (t) { return megaCount(t) <= 1; }));
        var twoMegas = megas.filter(function (e) { return e.pokemon.dex !== (megas[0] && megas[0].pokemon.dex); })[0];
        if (megas.length && twoMegas) {
          var threw = false;
          try { E.suggest(ctx, [megas[0].id, twoMegas.id], 'any', 5); } catch (err) { threw = /only one Mega/.test(err.message); }
          ok(league + ': two Mega picks are refused', threw);
        }
      }
      ok(league + ': best first', teams.every(function (t, i) { return i === 0 || teams[i - 1].score >= t.score; }));

      var two = E.suggest(ctx, [teams[0].members[0].id, teams[0].members[1].id], 'any', 3);
      ok(league + ': suggest-1 keeps both picks', two.length > 0 && two.every(function (t) {
        var ids = t.members.map(function (m) { return m.id; });
        return ids.indexOf(teams[0].members[0].id) !== -1 && ids.indexOf(teams[0].members[1].id) !== -1;
      }));

      var trio = teams[0].members.map(function (m) { return m.id; });
      var own = E.suggest(ctx, trio.slice().reverse(), 'abc', 5);
      ok(league + ': three picks give that team back, scored the same', own.length === 1 &&
        own[0].members.map(function (m) { return m.id; }).sort().join() === trio.slice().sort().join() &&
        Math.abs(own[0].score - teams[0].score) < 1e-9);
      var dupThrew = false;
      try { E.suggest(ctx, [trio[0], trio[1], trio[0]], 'any', 5); } catch (err) { dupThrew = /same species/.test(err.message); }
      ok(league + ': three picks with a repeated species are refused', dupThrew);

      var d = E.describeTeam(ctx, teams[0]);
      eq(league + ': roles', d.members.map(function (m) { return m.role; }), ['lead', 'swap', 'closer']);
      ok(league + ': members carry their PvPoke rank', d.members.every(function (m) {
        return ctx.ranked[m.rank - 1].id === m.id && m.rankedCount === ctx.ranked.length;
      }));
      ok(league + ': IVs fit the cap', d.members.every(function (m) { return m.ivs.cp <= cap; }));
      ok(league + ': every member has a fast and a charged move', d.members.every(function (m) { return m.moves.length >= 2; }));
      eq(league + ': three strengths and three weaknesses', [d.strengths.length, d.weaknesses.length], [3, 3]);
      ok(league + ': strengths rate higher than weaknesses', d.strengths[2].rating >= d.weaknesses[2].rating);
      ok(league + ': meta lists the top 30 threats in rank order with the best answer',
        d.meta.length === 30 && d.meta.every(function (t, i) {
          var best = Math.max.apply(null, teams[0].members.map(function (m) { return ctx.rows[m.id][i]; }));   // rows cached by describeTeam
          return t.id === ctx.threats[i].entry.id && t.rating === best &&
            d.members.some(function (m) { return m.name === t.answer; });
        }));
      var rowsOf = teams[0].members.map(function (m) { return ctx.rows[m.id]; });
      ok(league + ': pilot leadWins counts the lead\'s own top-30 wins',
        d.pilot.leadWins === rowsOf[0].slice(0, 30).filter(function (r) { return r > 550; }).length);
      ok(league + ': pilot switchFrom are leads the lead loses and the swap wins', d.pilot.switchFrom.every(function (t) {
        var i = ctx.threats.findIndex(function (x) { return x.entry.id === t.id; });
        return i >= 0 && i < 30 && rowsOf[0][i] < 450 && rowsOf[1][i] > 550;
      }) && d.pilot.switchFrom.length <= 3);
      ok(league + ': pilot closerOnly are threats only the closer wins', d.pilot.closerOnly.every(function (t) {
        var i = ctx.threats.findIndex(function (x) { return x.entry.id === t.id; });
        return i >= 0 && i < 30 && rowsOf[2][i] > 550 && rowsOf[0][i] <= 500 && rowsOf[1][i] <= 500;
      }));
      ok(league + ': pilot fast-move counts reach the cheapest charged move', d.pilot.counts.every(function (c, k) {
        var moves = d.members[k].moves;
        return c && c.count >= 1 && c.fast === moves[0].name && moves.slice(1).some(function (m) { return m.name === c.charged; });
      }));
      ok(league + ': display score is 0-100', d.displayScore >= 0 && d.displayScore <= 100, d.displayScore);
      ok(league + ': beats counts winning answers among the 100 threats', d.threatCount === 100 &&
        d.beats <= 100 && (d.weaknesses[0].rating > 500 || d.beats < 100), d.beats + '/' + d.threatCount);
    });
  });

  formats.filter(function (f) { return f.types; }).forEach(function (f) {
    test(f.name + ' only ranks ' + f.types.join(', ') + ' types', function () {
      var bad = raw['rankings-' + f.id].filter(function (r) {
        return !gm.pokemonById[r.id].types.some(function (t) { return f.types.indexOf(t) !== -1; });
      });
      eq(f.id + ': every ranked Pokémon is eligible', bad.map(function (r) { return r.id; }), []);
    });
  });

  test('best teams with no picks (great league, every style)', function () {
    var ctx = E.createContext(gm, raw['rankings-great'], 'great');
    ['abc', 'pair', 'any'].forEach(function (style) {
      var teams = E.bestTeams(ctx, style, 3);
      eq(style + ': three teams', teams.length, 3);
      ok(style + ': teams fit the style', teams.every(function (t) { return E.assignRoles(t.members, style) !== null; }));
      ok(style + ': no duplicate species', teams.every(function (t) {
        var dex = t.members.map(function (m) { return m.pokemon.dex; });
        return dex[0] !== dex[1] && dex[0] !== dex[2] && dex[1] !== dex[2];
      }));
      ok(style + ': best first', teams.every(function (t, i) { return i === 0 || teams[i - 1].score >= t.score; }));
      var counts = {};
      teams.forEach(function (t) { t.members.forEach(function (m) { counts[m.id] = (counts[m.id] || 0) + 1; }); });
      ok(style + ': no Pokémon in more than two teams', Object.keys(counts).every(function (id) { return counts[id] <= 2; }));
    });
  });

  // The banner shows each format's best-score teams and opens one by picking its lead and safe
  // swap, keeping the viewer's style if the team fits it (else Best score); the team must be
  // among those results.
  formats.forEach(function (f) {
    var league = f.id;
    test(league + ': top teams banner', function () {
      var ctx = E.createContext(gm, raw['rankings-' + league], f.cp);
      var teams = E.bestTeams(ctx, 'any', 3);
      eq(league + ': three banner teams', teams.length, 3);
      teams.forEach(function (t, i) {
        ['abc', 'pair', 'any'].forEach(function (style) {
          var used = E.assignRoles(t.members, style) ? style : 'any';
          var third = t.members[2].id;
          ok(league + ': banner team ' + (i + 1) + ' opens under ' + style,
            E.suggest(ctx, [t.members[0].id, t.members[1].id], used, 5).some(function (s) {
              return s.members.some(function (m) { return m.id === third; });
            }), 'searched as ' + used);
        });
      });
    });
  });

  // Without Elite TM moves: each ranking may carry a noElite moveset (from the data script).
  formats.forEach(function (f) {
    test(f.name + ': movesets without Elite TM moves', function () {
      var rankings = raw['rankings-' + f.id];
      var bad = rankings.filter(function (r) {
        if (!r.noElite) return false;
        var elite = gm.pokemonById[r.id].elite || [];
        return r.noElite.length !== r.moveset.length || r.noElite[0] !== r.moveset[0] && !gm.movesById[r.noElite[0]].energyGain ||
          r.noElite.some(function (m) { return elite.indexOf(m) !== -1 || !gm.movesById[m]; });
      });
      eq(f.id + ': no Elite moves left, same shape, fast move first', bad.map(function (r) { return r.id; }), []);
      var missing = rankings.slice(0, 100).filter(function (r) {
        var elite = gm.pokemonById[r.id].elite || [];
        return !r.noElite && r.moveset.some(function (m) { return elite.indexOf(m) !== -1; });
      });
      eq(f.id + ': every top-100 moveset with an Elite move has an alternative', missing.map(function (r) { return r.id; }), []);
    });
  });

  test('suggestions without Elite TM moves (great league)', function () {
    var ctx = E.createContext(gm, raw['rankings-great'], 1500, { noElite: true });
    var plain = E.createContext(gm, raw['rankings-great'], 1500);
    var teams = E.suggest(ctx, [ctx.ranked[0].id], 'abc', 5);
    eq('five suggestions', teams.length, 5);
    ok('team members use no Elite moves', teams.every(function (t) {
      return E.describeTeam(ctx, t).members.every(function (m) {
        return m.moves.every(function (mv) { return !mv.elite; }) || !ctx.byId[m.id].ranking.noElite;
      });
    }));
    var needy = ctx.ranked.filter(function (e) { return e.ranking.noElite; })[0];
    var d = E.describeTeam(ctx, { members: [needy, ctx.ranked[1], ctx.ranked[2]], score: 0 });
    ok('the replaced Elite moves are reported', d.members[0].withoutElite.length > 0, needy.id + ': ' + d.members[0].withoutElite.join(', '));
    eq('the same team in the usual context replaces nothing', E.describeTeam(plain, { members: [plain.byId[needy.id], plain.ranked[1], plain.ranked[2]], score: 0 })
      .members[0].withoutElite, []);
    eq('threats keep their usual movesets', ctx.threats.map(function (t) { return t.entry.battler.charged.map(function (m) { return m.moveId; }).join(); }),
      plain.threats.map(function (t) { return t.entry.battler.charged.map(function (m) { return m.moveId; }).join(); }));
    var top = E.bestTeams(ctx, 'any', 3);
    eq('the banner works without Elite moves too', top.length, 3);
  });

  test('suggest rejects bad input', function () {
    var ctx = E.createContext(gm, raw['rankings-great'], 'great');
    throws('unknown Pokémon', function () { E.suggest(ctx, ['not_a_pokemon'], 'abc'); });
    throws('two of the same species', function () { E.suggest(ctx, ['altaria', 'altaria_shadow'], 'abc'); });
    throws('no picks', function () { E.suggest(ctx, [], 'abc'); });
  });
})();
