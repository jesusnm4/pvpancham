#!/usr/bin/env node
// How often the simulator picks the same winner as PvPoke, per format. For each of a format's top
// 100 Pokémon, PvPoke lists its top 5 wins and losses at 1-1 shields; each is simulated at 1-1 and
// compared. Run before and after any simulator change (see CLAUDE.md). No dependencies.
//   node scripts/check-agreement.js
var fs = require('fs');
var path = require('path');
var vm = require('vm');

var root = path.join(__dirname, '..');
globalThis.window = globalThis;
function load(file) {
  vm.runInThisContext(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file });
}
load('data/formats.js');
load('data/gamemaster.js');
var raw = window.PvpData.raw;
raw.formats.formats.forEach(function (f) { load('data/rankings-' + f.id + '.js'); });
load('js/engine.js');

function index(list, key) {
  var map = {};
  list.forEach(function (x) { map[x[key]] = x; });
  return map;
}
var gm = { pokemonById: index(raw.gamemaster.pokemon, 'id'), movesById: index(raw.gamemaster.moves, 'moveId') };
function isMega(p) { return (p.tags || []).indexOf('mega') !== -1; }

raw.formats.formats.forEach(function (f) {
  var ctx = window.Engine.createContext(gm, raw['rankings-' + f.id], f.cp);
  var same = 0, total = 0, gap = 0, megaSame = 0, megaTotal = 0;
  ctx.ranked.slice(0, 100).forEach(function (e) {
    var a = window.Engine.makeBattler(e.pokemon, e.ranking.moveset, f.cp, gm.movesById);
    if (!a) return;
    e.ranking.wins.concat(e.ranking.losses).forEach(function (m) {
      var o = ctx.byId[m[0]];
      if (!o || m[1] === 500) return;
      var b = window.Engine.makeBattler(o.pokemon, o.ranking.moveset, f.cp, gm.movesById);
      if (!b) return;
      var rating = window.Engine.simulate(a, b, 1, 1);
      var agrees = (rating > 500) === (m[1] > 500);
      total++; same += agrees; gap += Math.abs(rating - m[1]);
      if (isMega(e.pokemon) || isMega(o.pokemon)) { megaTotal++; megaSame += agrees; }
    });
  });
  console.log((f.name + ':').padEnd(26) + (100 * same / total).toFixed(1) + '% of ' + total + ', average gap ' +
    Math.round(gap / total) + (megaTotal ? '; battles with a Mega: ' + (100 * megaSame / megaTotal).toFixed(1) + '% of ' + megaTotal : ''));
});
