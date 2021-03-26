/**
 *
 *
 * @author Jerry Bendy <jerry@icewingcc.com>
 * @licence MIT
 *
 */

 (function(self) {
    'use strict';

    var nativeURLSearchParams = (function() {
            // #41 Fix issue in RN
            try {
                if (self.URLSearchParams && (new self.URLSearchParams('foo=bar')).get('foo') === 'bar') {
                    return self.URLSearchParams;
                }
            } catch (e) {}
            return null;
        })(),
        isSupportObjectConstructor = nativeURLSearchParams && (new nativeURLSearchParams({a: 1})).toString() === 'a=1',
        // There is a bug in safari 10.1 (and earlier) that incorrectly decodes `%2B` as an empty space and not a plus.
        decodesPlusesCorrectly = nativeURLSearchParams && (new nativeURLSearchParams('s=%2B').get('s') === '+'),
        __URLSearchParams__ = "__URLSearchParams__",
        // Fix bug in Edge which cannot encode ' &' correctly
        encodesAmpersandsCorrectly = nativeURLSearchParams ? (function() {
            var ampersandTest = new nativeURLSearchParams();
            ampersandTest.append('s', ' &');
            return ampersandTest.toString() === 's=+%26';
        })() : true,
        prototype = URLSearchParamsPolyfill.prototype,
        iterable = !!(self.Symbol && self.Symbol.iterator);

    if (nativeURLSearchParams && isSupportObjectConstructor && decodesPlusesCorrectly && encodesAmpersandsCorrectly) {
        return;
    }


    /**
     * Make a URLSearchParams instance
     *
     * @param {object|string|URLSearchParams} search
     * @constructor
     */
    function URLSearchParamsPolyfill(search) {
        search = search || "";

        // support construct object with another URLSearchParams instance
        if (search instanceof URLSearchParams || search instanceof URLSearchParamsPolyfill) {
            search = search.toString();
        }
        this [__URLSearchParams__] = parseToDict(search);
    }


    /**
     * Appends a specified key/value pair as a new search parameter.
     *
     * @param {string} name
     * @param {string} value
     */
    prototype.append = function(name, value) {
        appendTo(this [__URLSearchParams__], name, value);
    };

    /**
     * Deletes the given search parameter, and its associated value,
     * from the list of all search parameters.
     *
     * @param {string} name
     */
    prototype['delete'] = function(name) {
        delete this [__URLSearchParams__] [name];
    };

    /**
     * Returns the first value associated to the given search parameter.
     *
     * @param {string} name
     * @returns {string|null}
     */
    prototype.get = function(name) {
        var dict = this [__URLSearchParams__];
        return this.has(name) ? dict[name][0] : null;
    };

    /**
     * Returns all the values association with a given search parameter.
     *
     * @param {string} name
     * @returns {Array}
     */
    prototype.getAll = function(name) {
        var dict = this [__URLSearchParams__];
        return this.has(name) ? dict [name].slice(0) : [];
    };

    /**
     * Returns a Boolean indicating if such a search parameter exists.
     *
     * @param {string} name
     * @returns {boolean}
     */
    prototype.has = function(name) {
        return hasOwnProperty(this [__URLSearchParams__], name);
    };

    /**
     * Sets the value associated to a given search parameter to
     * the given value. If there were several values, delete the
     * others.
     *
     * @param {string} name
     * @param {string} value
     */
    prototype.set = function set(name, value) {
        this [__URLSearchParams__][name] = ['' + value];
    };

    /**
     * Returns a string containg a query string suitable for use in a URL.
     *
     * @returns {string}
     */
    prototype.toString = function() {
        var dict = this[__URLSearchParams__], query = [], i, key, name, value;
        for (key in dict) {
            name = encode(key);
            for (i = 0, value = dict[key]; i < value.length; i++) {
                query.push(name + '=' + encode(value[i]));
            }
        }
        return query.join('&');
    };

    // There is a bug in Safari 10.1 and `Proxy`ing it is not enough.
    var forSureUsePolyfill = !decodesPlusesCorrectly;
    var useProxy = (!forSureUsePolyfill && nativeURLSearchParams && !isSupportObjectConstructor && self.Proxy);
    var propValue; 
    if (useProxy) {
        // Safari 10.0 doesn't support Proxy, so it won't extend URLSearchParams on safari 10.0
        propValue = new Proxy(nativeURLSearchParams, {
            construct: function (target, args) {
                return new target((new URLSearchParamsPolyfill(args[0]).toString()));
            }
        })
        // Chrome <=60 .toString() on a function proxy got error "Function.prototype.toString is not generic"
        propValue.toString = Function.prototype.toString.bind(URLSearchParamsPolyfill);
    } else {
        propValue = URLSearchParamsPolyfill;
    }
    /*
     * Apply polifill to global object and append other prototype into it
     */
    Object.defineProperty(self, 'URLSearchParams', {
        value: propValue
    });

    var USPProto = self.URLSearchParams.prototype;

    USPProto.polyfill = true;

    /**
     *
     * @param {function} callback
     * @param {object} thisArg
     */
    USPProto.forEach = USPProto.forEach || function(callback, thisArg) {
        var dict = parseToDict(this.toString());
        Object.getOwnPropertyNames(dict).forEach(function(name) {
            dict[name].forEach(function(value) {
                callback.call(thisArg, value, name, this);
            }, this);
        }, this);
    };

    /**
     * Sort all name-value pairs
     */
    USPProto.sort = USPProto.sort || function() {
        var dict = parseToDict(this.toString()), keys = [], k, i, j;
        for (k in dict) {
            keys.push(k);
        }
        keys.sort();

        for (i = 0; i < keys.length; i++) {
            this['delete'](keys[i]);
        }
        for (i = 0; i < keys.length; i++) {
            var key = keys[i], values = dict[key];
            for (j = 0; j < values.length; j++) {
                this.append(key, values[j]);
            }
        }
    };

    /**
     * Returns an iterator allowing to go through all keys of
     * the key/value pairs contained in this object.
     *
     * @returns {function}
     */
    USPProto.keys = USPProto.keys || function() {
        var items = [];
        this.forEach(function(item, name) {
            items.push(name);
        });
        return makeIterator(items);
    };

    /**
     * Returns an iterator allowing to go through all values of
     * the key/value pairs contained in this object.
     *
     * @returns {function}
     */
    USPProto.values = USPProto.values || function() {
        var items = [];
        this.forEach(function(item) {
            items.push(item);
        });
        return makeIterator(items);
    };

    /**
     * Returns an iterator allowing to go through all key/value
     * pairs contained in this object.
     *
     * @returns {function}
     */
    USPProto.entries = USPProto.entries || function() {
        var items = [];
        this.forEach(function(item, name) {
            items.push([name, item]);
        });
        return makeIterator(items);
    };


    if (iterable) {
        USPProto[self.Symbol.iterator] = USPProto[self.Symbol.iterator] || USPProto.entries;
    }


    function encode(str) {
        var replace = {
            '!': '%21',
            "'": '%27',
            '(': '%28',
            ')': '%29',
            '~': '%7E',
            '%20': '+',
            '%00': '\x00'
        };
        return encodeURIComponent(str).replace(/[!'\(\)~]|%20|%00/g, function(match) {
            return replace[match];
        });
    }

    function decode(str) {
        return str
            .replace(/[ +]/g, '%20')
            .replace(/(%[a-f0-9]{2})+/ig, function(match) {
                return decodeURIComponent(match);
            });
    }

    function makeIterator(arr) {
        var iterator = {
            next: function() {
                var value = arr.shift();
                return {done: value === undefined, value: value};
            }
        };

        if (iterable) {
            iterator[self.Symbol.iterator] = function() {
                return iterator;
            };
        }

        return iterator;
    }

    function parseToDict(search) {
        var dict = {};

        if (typeof search === "object") {
            // if `search` is an array, treat it as a sequence
            if (isArray(search)) {
                for (var i = 0; i < search.length; i++) {
                    var item = search[i];
                    if (isArray(item) && item.length === 2) {
                        appendTo(dict, item[0], item[1]);
                    } else {
                        throw new TypeError("Failed to construct 'URLSearchParams': Sequence initializer must only contain pair elements");
                    }
                }

            } else {
                for (var key in search) {
                    if (search.hasOwnProperty(key)) {
                        appendTo(dict, key, search[key]);
                    }
                }
            }

        } else {
            // remove first '?'
            if (search.indexOf("?") === 0) {
                search = search.slice(1);
            }

            var pairs = search.split("&");
            for (var j = 0; j < pairs.length; j++) {
                var value = pairs [j],
                    index = value.indexOf('=');

                if (-1 < index) {
                    appendTo(dict, decode(value.slice(0, index)), decode(value.slice(index + 1)));

                } else {
                    if (value) {
                        appendTo(dict, decode(value), '');
                    }
                }
            }
        }

        return dict;
    }

    function appendTo(dict, name, value) {
        var val = typeof value === 'string' ? value : (
            value !== null && value !== undefined && typeof value.toString === 'function' ? value.toString() : JSON.stringify(value)
        );

        // #47 Prevent using `hasOwnProperty` as a property name
        if (hasOwnProperty(dict, name)) {
            dict[name].push(val);
        } else {
            dict[name] = [val];
        }
    }

    function isArray(val) {
        return !!val && '[object Array]' === Object.prototype.toString.call(val);
    }

    function hasOwnProperty(obj, prop) {
        return Object.prototype.hasOwnProperty.call(obj, prop);
    }

})(typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : this));

const categoriesKeys = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
  "pwa",
];

function request(url) {
  try {
    return UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  } catch(error) {
    console.log(error);
  }
}

function createRequestUrl(baseUrl, strategy) {
  const googleApiBaseUrl = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
  const queryBase = {
    url: baseUrl,
    key: "FIXME",
    strategy,
  };
  const queryInstance = new URLSearchParams(queryBase);
  categoriesKeys.forEach((categoryKey) => {
    queryInstance.append("category", categoryKey);
  });
  return `${googleApiBaseUrl}?${queryInstance.toString()}`;
}

function createInsertRecord(responseJson, url) {
  const now = dayjs.dayjs(new Date()).format();

  const { loadingExperience, lighthouseResult } = responseJson;

  const loadingExperienceMetricsKeys = ["CUMULATIVE_LAYOUT_SHIFT_SCORE", "FIRST_CONTENTFUL_PAINT_MS", "FIRST_INPUT_DELAY_MS", "LARGEST_CONTENTFUL_PAINT_MS"];

  const loadingExperienceMetrics = loadingExperienceMetricsKeys.map((key) => loadingExperience.metrics[key]);

  const { categories, audits } = lighthouseResult;

  const lightHouseResultScores = categoriesKeys.map((key) => categories[key]);

  const auditsKeys = [ "aria-required-attr","final-screenshot","legacy-javascript","offscreen-content-hidden","redirects-http","js-libraries","first-contentful-paint-3g","is-on-https","html-lang-valid","duplicated-javascript","duplicate-id-active","no-vulnerable-libraries","video-caption","largest-contentful-paint-element","pwa-page-transitions","efficient-animated-content","deprecations","aria-progressbar-name","button-name","uses-rel-preconnect","errors-in-console","aria-hidden-focus","network-requests","aria-roles","inspector-issues","font-display","doctype","object-alt","full-page-screenshot","td-headers-attr","tap-targets","dlitem","meta-refresh","offscreen-images","third-party-facades","first-cpu-idle","total-blocking-time","unminified-css","pwa-each-page-has-url","cumulative-layout-shift","non-composited-animations","themed-omnibox","th-has-data-cells","layout-shift-elements","aria-required-children","managed-focus","heading-order","uses-responsive-images","definition-list","form-field-multiple-labels","input-image-alt","canonical","external-anchors-use-rel-noopener","visual-order-follows-dom","diagnostics","html-has-lang","no-unload-listeners","focusable-controls","aria-tooltip-name","network-rtt","link-text","long-tasks","preload-fonts","focus-traps","hreflang","appcache-manifest","aria-valid-attr","custom-controls-labels","listitem","pwa-cross-browser","crawlable-anchors","aria-meter-name","font-size","estimated-input-latency","aria-command-name","aria-treeitem-name","uses-webp-images","aria-required-parent","bootup-time","max-potential-fid","link-name","uses-rel-preload","installable-manifest","unused-javascript","notification-on-start","dom-size","structured-data","is-crawlable","uses-text-compression","metrics","valid-lang","interactive","first-contentful-paint","geolocation-on-start","preload-lcp-image","screenshot-thumbnails","password-inputs-can-be-pasted-into","resource-summary","splash-screen","color-contrast","user-timings","uses-long-cache-ttl","duplicate-id-aria","unused-css-rules","total-byte-weight","meta-description","unsized-images","timing-budget","uses-optimized-images","third-party-summary","redirects","first-meaningful-paint","main-thread-tasks","aria-hidden-body","http-status-code","aria-input-field-name","unminified-javascript","largest-contentful-paint","robots-txt","content-width","service-worker","accesskeys","meta-viewport","aria-allowed-attr","aria-toggle-field-name","image-size-responsive","render-blocking-resources","critical-request-chains","uses-passive-event-listeners","charset","logical-tab-order","maskable-icon","interactive-element-affordance","plugins","list","frame-title","server-response-time","image-aspect-ratio","tabindex","bypass","custom-controls-roles","document-title","viewport","speed-index","mainthread-work-breakdown","performance-budget","apple-touch-icon","no-document-write","valid-source-maps","aria-valid-attr-value","use-landmarks","image-alt","label","network-server-latency", ];

  const lightHouseAudits = auditsKeys.map((key) => audits[key]);

  const row = [
      now,
      url,
      ...loadingExperienceMetrics.map(({percentile}) => percentile),
      ...lightHouseResultScores.map(({ score }) => score),
      ...lightHouseAudits.map(({ score }) => score)
    ];
  return row;
}

function main() {
  dayjs.dayjs.locale("ja");

  const sheetId = "FIXME";
  const sheetName1 = "url1";
  const sheetName2 = "url2";
  const targetUrl1 = "FIXME";
  const targetUrl2 = "FIXME";
  const sheet1 = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName1);
  const sheet2 = SpreadsheetApp.openById(sheetId).getSheetByName(sheetName2);

  const response1 = request(createRequestUrl(targetUrl1, "mobile"));
  const response2 = request(createRequestUrl(targetUrl2, "mobile"));

  sheet1.appendRow(createInsertRecord(JSON.parse(response1.getContentText()), targetUrl1));
  sheet2.appendRow(createInsertRecord(JSON.parse(response2.getContentText()), targetUrl2));
}
