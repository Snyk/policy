module.exports = attachNotes;

const debug = require('debug')('snyk:policy');
const matchToRule = require('../match').matchToRule;

function attachNotes(notes, vuln) {
  if (!notes) {
    return vuln;
  }
  debug('attaching notes');
  const now = new Date().toJSON();

  return vuln.map(function (vuln) {
    if (!notes[vuln.id]) {
      return vuln;
    }

    debug('%s has rules', vuln.id);

    // if rules.some, then add note to the vuln
    notes[vuln.id].forEach(function (rule) {
      const path = Object.keys(rule)[0]; // this is a string
      let expires = rule[path].expires;

      // first check if the path is a match on the rule
      const pathMatch = matchToRule(vuln, rule);

      if (expires && expires.toJSON) {
        expires = expires.toJSON();
      }

      if (pathMatch && expires && expires < now) {
        debug('%s vuln rule has expired (%s)', vuln.id, expires);
        return false;
      }

      if (
        pathMatch &&
        rule[path].disregardIfFixable &&
        (vuln.upgradePath.length || vuln.patches.length)
      ) {
        debug(
          '%s vuln is fixable and rule is set to disregard if fixable',
          vuln.id
        );
        return false;
      }

      if (pathMatch) {
        // strip any control characters in the 3rd party reason file
        const reason = rule[path].reason.replace('/[\x00-\x1F\x7F-\x9F]/u', '');
        if (debug.enabled) {
          debug(
            'adding note based on path match: %s ~= %s',
            path,
            vuln.from.slice(1).join(' > ')
          );
        }
        vuln.note =
          'Snyk policy in ' +
          rule[path].from +
          ' suggests ignoring this issue, with reason: ' +
          reason;
      }

      return false;
    });

    return vuln;
  });
}
