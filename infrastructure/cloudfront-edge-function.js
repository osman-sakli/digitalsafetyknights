// AWS CloudFront Function "dsk-stats-auth", viewer-request, on distribution
// E1XP6H2UONLEBO (digitalsafetyknights.org). NOT deployed automatically by
// CI/deploy.sh — this file is the source of truth for reference/review, but
// an edit here only takes effect once pushed to AWS by hand:
//   aws cloudfront update-function --name dsk-stats-auth \
//     --function-config Comment="...",Runtime=cloudfront-js-2.0 \
//     --function-code fileb://infrastructure/cloudfront-edge-function.js \
//     --if-match <ETag from `aws cloudfront describe-function --name dsk-stats-auth --stage DEVELOPMENT`>
//   # test first: aws cloudfront test-function --name dsk-stats-auth --stage DEVELOPMENT --if-match <new ETag> --event-object fileb://event.json
//   aws cloudfront publish-function --name dsk-stats-auth --if-match <ETag from the update-function response>
//
// Edge guard, three jobs:
//   1. Password-gate the private traffic pages.
//   2. Reject vulnerability probes before they reach the origin.
//   3. Geo-route first-time visitors to /tr/ (Turkey) or /es/ (Spanish-
//      speaking countries) on unprefixed page requests, so the base site
//      reads as English by default and language is not guessed from the
//      visitor's browser settings (which was actively wrong for people
//      whose device language/timezone didn't match where they are).
//      CloudFront-Viewer-Country is edge metadata CloudFront already has
//      for every request — no third-party geo-IP lookup, nothing sent
//      off-site, consistent with the site's "no tracking" stance. A
//      dsk_lang cookie (set once a visitor picks/lands on a language)
//      always wins over this and skips the redirect on every later visit.
//
// Deliberately does NOT block search or AI crawlers — robots.txt invites
// GPTBot/ClaudeBot/Googlebot on purpose, since being found is the org's
// actual bottleneck. Only unambiguous attack traffic is dropped: paths for
// software this site does not run, and named exploit tools.
var PROBES = [
  '/wp-admin', '/wp-login', '/wp-content', '/wp-includes', '/wordpress',
  '/xmlrpc', '/.env', '/.git', '/phpmyadmin', '/administrator', '/cgi-bin',
  '/vendor/', '/.aws', '/config.php', '/shell', '/adminer', '/solr',
  '/actuator', '/api/jsonws', '/.ssh', '/backup.sql', '/.svn', '/owa/',
  '/autodiscover', '/hudson', '/jenkins', '/struts', '/laravel'
];
var BAD_AGENTS = ['wp2shell', 'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'nuclei'];

// Spanish-speaking countries (ISO 3166-1 alpha-2) — the site's actual ES
// audience, not literally "South America": includes Mexico, Central
// America, Spain and the Caribbean too. Brazil is excluded (Portuguese).
var ES_COUNTRIES = {
  AR: 1, BO: 1, CL: 1, CO: 1, CR: 1, CU: 1, DO: 1, EC: 1, SV: 1, GQ: 1,
  GT: 1, HN: 1, MX: 1, NI: 1, PA: 1, PY: 1, PE: 1, ES: 1, UY: 1, VE: 1, PR: 1
};

var SKIP_PREFIXES = [
  '/assets/', '/guides/', '/journal/', '/content/', '/videos/',
  '/monthly-report/', '/en/', '/tr/', '/es/'
];

function handler(event) {
  var request = event.request;
  var uri = request.uri.toLowerCase();
  var headers = request.headers;

  for (var i = 0; i < PROBES.length; i++) {
    if (uri.indexOf(PROBES[i]) !== -1) {
      return { statusCode: 403, statusDescription: 'Forbidden',
               headers: { 'cache-control': { value: 'no-store' } } };
    }
  }

  var ua = headers['user-agent'] ? headers['user-agent'].value.toLowerCase() : '';
  for (var j = 0; j < BAD_AGENTS.length; j++) {
    if (ua.indexOf(BAD_AGENTS[j]) !== -1) {
      return { statusCode: 403, statusDescription: 'Forbidden',
               headers: { 'cache-control': { value: 'no-store' } } };
    }
  }

  var isPrivate = request.uri === '/stats.html' || request.uri === '/content/traffic-stats.json';
  if (isPrivate) {
    if (headers.authorization && headers.authorization.value === 'Basic b3NtYW46MlJsSlNZdGo5bkVrc3I=') {
      return request;
    }
    return {
      statusCode: 401, statusDescription: 'Unauthorized',
      headers: {
        'www-authenticate': { value: 'Basic realm="DSK Traffic"' },
        'cache-control': { value: 'no-store' }
      }
    };
  }

  var eligible = request.uri === '/' || uri.slice(-5) === '.html';
  for (var k = 0; eligible && k < SKIP_PREFIXES.length; k++) {
    if (uri.indexOf(SKIP_PREFIXES[k]) === 0) { eligible = false; }
  }

  if (eligible && !(request.cookies && request.cookies.dsk_lang)) {
    var country = headers['cloudfront-viewer-country'] ? headers['cloudfront-viewer-country'].value : '';
    var target = null;
    if (country === 'TR') { target = 'tr'; }
    else if (ES_COUNTRIES[country]) { target = 'es'; }

    if (target) {
      var qs = request.querystring ? Object.keys(request.querystring).map(function (k2) {
        return k2 + (request.querystring[k2].value ? '=' + request.querystring[k2].value : '');
      }).join('&') : '';
      var loc = '/' + target + request.uri + (qs ? '?' + qs : '');
      return {
        statusCode: 302, statusDescription: 'Found',
        headers: {
          location: { value: loc },
          'cache-control': { value: 'private, no-store' }
        }
      };
    }
  }

  return request;
}
