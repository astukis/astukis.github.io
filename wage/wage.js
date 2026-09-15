(function () {
	'use strict';

	var $ = function (id) { return document.getElementById(id); };

	var els = {
		rate: $('rate'),
		hours: $('hours'),
		minutes: $('minutes'),
		paste: $('paste'),
		total: $('total'),
		words: $('words'),
		error: $('error'),
		hint: $('hint'),
		breakdown: $('breakdown'),
		extra: $('extra'),
		extraPanel: $('extra-panel'),
		bonus: $('bonus'),
		currency: $('bonus-currency'),
		fxNote: $('fx-note')
	};

	/* ============ number to words ============ */

	var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
		'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
	var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
	var SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

	function belowHundred(n) {
		if (n < 20) return ONES[n];
		var word = TENS[Math.floor(n / 10)];
		var rest = ONES[n % 10];
		return rest ? word + '-' + rest : word;
	}

	function belowThousand(n) {
		if (n < 100) return belowHundred(n);
		var hundred = Math.floor(n / 100);
		var rest = n % 100;
		var out = ONES[hundred] + ' hundred';
		return rest ? out + ' ' + belowHundred(rest) : out;
	}

	function numberToWords(num) {
		if (num === 0) return 'zero';
		var out = '';
		var scale = 0;
		while (num > 0) {
			var chunk = num % 1000;
			if (chunk > 0) {
				var words = belowThousand(chunk);
				if (SCALES[scale]) words += ' ' + SCALES[scale];
				out = words + (out ? ' ' + out : '');
			}
			num = Math.floor(num / 1000);
			scale++;
		}
		return out;
	}

	function moneyToWords(euros, cents) {
		var e = euros ? numberToWords(euros) + ' ' + (euros === 1 ? 'euro' : 'euros') : '';
		var c = cents ? numberToWords(cents) + ' ' + (cents === 1 ? 'cent' : 'cents') : '';
		if (e && c) return e + ' and ' + c;
		return e || c || 'zero euros';
	}

	/* ============ number formatting ============ */

	function centsText(cents) {
		var euros = Math.floor(cents / 100);
		var c = Math.round(cents % 100);
		return euros.toLocaleString('lt-LT') + ',' + String(c).padStart(2, '0');
	}

	/* ============ input parsing ============ */

	function toNumber(raw) {
		if (typeof raw !== 'string') return NaN;
		return parseFloat(raw.trim().replace(/\s/g, '').replace(/,/g, '.').replace(/[^\d.-]/g, ''));
	}

	function parseDuration(text) {
		var s = text.trim().toLowerCase().replace(/\s+/g, ' ');
		if (!s) return null;

		var m = s.match(/^(\d{1,4}):(\d{1,2})(?::(\d{1,2}))?$/);
		if (m) {
			var min = +m[2];
			if (min > 59) return null;
			if (m[3] && +m[3] > 59) return null;
			return (+m[1]) * 60 + min;
		}

		m = s.match(/^(\d+(?:[.,]\d+)?)\s*h(?:ours?)?\s*(?:(\d+(?:[.,]\d+)?)\s*m(?:ins?)?)?$/);
		if (m) {
			var mm = m[2] ? +m[2].replace(',', '.') : 0;
			if (mm > 59) return null;
			return Math.round(+m[1].replace(',', '.') * 60 + mm);
		}

		m = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:h(?:ours?)?)?$/);
		if (m) return Math.round(+m[1].replace(',', '.') * 60);

		return null;
	}

	/* ============ live USD -> EUR rate ============ */

	var RATE_KEY = 'astukis-usd-eur';
	var usdToEur = null;
	var ratePromise = null;

	function getCachedRate() {
		try {
			var cached = JSON.parse(localStorage.getItem(RATE_KEY));
			if (cached && typeof cached.rate === 'number' && Date.now() - cached.ts < 12 * 3600 * 1000) {
				return cached.rate;
			}
		} catch (e) { /* noop */ }
		return null;
	}

	function fetchUsdToEur() {
		if (usdToEur !== null) return Promise.resolve(usdToEur);
		if (ratePromise) return ratePromise;

		ratePromise = fetch('https://open.er-api.com/v6/latest/USD')
			.then(function (res) {
				if (!res.ok) throw new Error('HTTP ' + res.status);
				return res.json();
			})
			.then(function (data) {
				usdToEur = data.rates.EUR;
				ratePromise = null;
				try {
					localStorage.setItem(RATE_KEY, JSON.stringify({ rate: usdToEur, ts: Date.now() }));
				} catch (e) { /* noop */ }
				return usdToEur;
			})
			.catch(function (err) {
				ratePromise = null;
				var cached = getCachedRate();
				if (cached !== null) {
					usdToEur = cached;
					return usdToEur;
				}
				throw err;
			});

		return ratePromise;
	}

	function updateFxNote() {
		if (els.currency.value !== 'USD' || usdToEur === null) return;
		var b = 0;
		var bRaw = els.bonus.value;
		var hasAmount = !!bRaw.trim();
		if (hasAmount) {
			b = toNumber(bRaw);
			if (isNaN(b) || b < 0) {
				els.fxNote.textContent = '1 USD = ' + usdToEur.toFixed(4).replace('.', ',') + ' EUR';
			} else {
				els.fxNote.textContent = '1 USD = ' + usdToEur.toFixed(4).replace('.', ',') +
					' EUR \u00B7 ' + centsText(Math.round(b * 100)) + ' USD = ' +
					centsText(Math.round(b * usdToEur * 100)) + ' EUR';
			}
		} else {
			els.fxNote.textContent = '1 USD = ' + usdToEur.toFixed(4).replace('.', ',') + ' EUR';
		}
		els.fxNote.hidden = false;
	}

	function handleCurrencyChange() {
		if (els.currency.value === 'USD') {
			els.fxNote.textContent = 'Fetching live USD\u2192EUR rate\u2026';
			els.fxNote.hidden = false;
			fetchUsdToEur().then(function () {
				els.error.hidden = true;
				updateFxNote();
				calculate();
			}, function () {
				els.fxNote.hidden = true;
				showError('Couldn\u2019t load USD\u2192EUR rate. Check your connection or use EUR.', els.currency);
			});
		} else {
			els.fxNote.hidden = true;
			calculate();
		}
	}

	/* ============ calculation ============ */

	function setTotal(totalCents, wageCents, bonusCents) {
		var euros = Math.floor(totalCents / 100);
		var cents = Math.round(totalCents % 100);
		els.total.value = centsText(totalCents) + ' \u20AC';
		els.words.textContent = moneyToWords(euros, cents);

		if (bonusCents > 0) {
			els.breakdown.textContent = centsText(wageCents) + ' \u20AC + ' +
				centsText(bonusCents) + ' \u20AC bonus = ' + centsText(totalCents) + ' \u20AC';
			els.breakdown.hidden = false;
		} else {
			els.breakdown.hidden = true;
		}
	}

	function setNeutral() {
		els.total.value = '0,00 \u20AC';
		els.words.textContent = '\u2014';
		els.breakdown.hidden = true;
	}

	function showError(msg, field) {
		els.hint.hidden = true;
		els.error.textContent = msg;
		els.error.hidden = false;
		if (field && field.classList) {
			field.classList.remove('shake');
			void field.offsetWidth;
			field.classList.add('shake');
		}
	}

	function clearError() {
		els.error.textContent = '';
		els.error.hidden = true;
	}

	function calculate() {
		var rateRaw = els.rate.value;
		var hRaw = els.hours.value;
		var mRaw = els.minutes.value;

		var baseFilled = {
			rate: !!rateRaw.trim(),
			hours: !!hRaw.trim(),
			minutes: !!mRaw.trim()
		};

		if (!baseFilled.rate && !baseFilled.hours && !baseFilled.minutes) {
			setNeutral();
			clearError();
			els.hint.hidden = true;
			return;
		}

		var missing = [];
		if (!baseFilled.rate) missing.push('an hourly rate');
		if (!baseFilled.hours) missing.push('hours');
		if (!baseFilled.minutes) missing.push('minutes');
		if (missing.length) {
			setNeutral();
			clearError();
			els.hint.textContent = 'Enter ' + missing.join(' and ') + ' to see the total.';
			els.hint.hidden = false;
			return;
		}

		var rate = toNumber(rateRaw);
		var hours = toNumber(hRaw);
		var minutes = toNumber(mRaw);

		if (isNaN(rate) || rate < 0) return showError('Enter a valid hourly rate (e.g. 12,50).', els.rate);
		if (isNaN(hours) || hours < 0) return showError('Enter a valid number of hours.', els.hours);
		if (isNaN(minutes)) return showError('Enter a valid number of minutes.', els.minutes);
		if (!Number.isInteger(minutes) || minutes > 59) return showError('Minutes must be a whole number between 0 and 59.', els.minutes);

		var wageCents = Math.round(((hours * 60 + minutes) * rate * 100) / 60);

		var bonusCents = 0;
		if (els.extra.checked) {
			var bRaw = els.bonus.value;
			if (bRaw.trim()) {
				var b = toNumber(bRaw);
				if (isNaN(b) || b < 0) return showError('Enter a valid bonus amount.', els.bonus);

				if (els.currency.value === 'USD') {
					if (usdToEur === null) {
						showError('USD rate not loaded yet \u2014 try again in a moment or use EUR.', els.currency);
						return;
					}
					bonusCents = Math.round(b * usdToEur * 100);
				} else {
					bonusCents = Math.round(b * 100);
				}
			}
		}

		clearError();
		els.hint.hidden = true;
		setTotal(wageCents + bonusCents, wageCents, bonusCents);
		updateFxNote();
	}

	function handlePaste() {
		var value = els.paste.value;
		if (!value.trim()) return;
		var minutesTotal = parseDuration(value);
		if (minutesTotal === null) {
			showError('Couldn\u2019t read that. Try \u201C38h 7m\u201D, \u201C8:30\u201D or \u201C2,5h\u201D.', els.paste);
			return;
		}
		els.hours.value = Math.floor(minutesTotal / 60);
		els.minutes.value = minutesTotal % 60;
		clearError();
		calculate();
	}

	/* ============ copy helpers ============ */

	function copyText(text, btn) {
		if (navigator.clipboard && window.isSecureContext) {
			navigator.clipboard.writeText(text).then(function () {
				flash(btn);
			}, function () { fallbackCopy(text, btn); });
		} else {
			fallbackCopy(text, btn);
		}
	}

	function fallbackCopy(text, btn) {
		var ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		ta.select();
		try { document.execCommand('copy'); } catch (e) { /* noop */ }
		document.body.removeChild(ta);
		flash(btn);
	}

	function flash(btn) {
		btn.dataset.state = 'done';
		btn.textContent = 'copied';
		setTimeout(function () {
			btn.dataset.state = '';
			btn.textContent = 'copy';
		}, 1200);
	}

	/* ============ events ============ */

	['rate', 'hours', 'minutes'].forEach(function (id) {
		els[id].addEventListener('input', calculate);
	});

	els.paste.addEventListener('input', handlePaste);
	els.bonus.addEventListener('input', calculate);
	els.currency.addEventListener('change', handleCurrencyChange);

	els.extra.addEventListener('change', function () {
		els.extraPanel.hidden = !els.extra.checked;
		if (els.extra.checked) {
			if (els.currency.value === 'USD') handleCurrencyChange();
		} else {
			els.fxNote.hidden = true;
			calculate();
		}
	});

	document.querySelectorAll('.copy').forEach(function (btn) {
		if (btn.dataset.copy === 'total') {
			btn.addEventListener('click', function () { copyText(els.total.value, btn); });
		} else if (btn.dataset.copy === 'words') {
			btn.addEventListener('click', function () { copyText(els.words.textContent, btn); });
		}
	});

	calculate();
})();