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
		error: $('error')
	};

	/* ============ number to words ============ */

	var ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
		'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
	var TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
	var SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

	// 0..99 in words, hyphenated where standard English requires
	function belowHundred(n) {
		if (n < 20) return ONES[n];
		var word = TENS[Math.floor(n / 10)];
		var rest = ONES[n % 10];
		return rest ? word + '-' + rest : word;
	}

	// 0..999 in words
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

	/* ============ input parsing ============ */

	// "12,5" -> 12.5 ; strips spaces and stray € signs
	function toNumber(raw) {
		if (typeof raw !== 'string') return NaN;
		return parseFloat(raw.trim().replace(/\s/g, '').replace(/,/g, '.').replace(/[^\d.-]/g, ''));
	}

	// Parse a pasted duration into total minutes, or null if unreadable.
	// Supports: "38h 7m", "38 h 30 min", "8:30", "08:30:00", "2,5h", "40"
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

	/* ============ calculation ============ */

	function setTotal(totalCents) {
		var euros = Math.floor(totalCents / 100);
		var cents = Math.round(totalCents % 100);
		var grouped = euros.toLocaleString('lt-LT');
		els.total.value = grouped + ',' + String(cents).padStart(2, '0') + ' \u20AC';
		els.words.textContent = moneyToWords(euros, cents);
	}

	function showError(msg, field) {
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

		if (!rateRaw.trim() && !hRaw.trim() && !mRaw.trim()) {
			els.total.value = '0,00 \u20AC';
			els.words.textContent = '\u2014';
			clearError();
			return;
		}

		var rate = toNumber(rateRaw);
		var hours = toNumber(hRaw);
		var minutes = toNumber(mRaw);

		if (isNaN(rate) || rate < 0) return showError('Enter a valid hourly rate (e.g. 12,50).', els.rate);
		if (isNaN(hours) || hours < 0) return showError('Enter a valid number of hours.', els.hours);
		if (isNaN(minutes)) return showError('Enter a valid number of minutes.', els.minutes);
		if (!Number.isInteger(minutes) || minutes > 59) return showError('Minutes must be a whole number between 0 and 59.', els.minutes);

		// exact integer math: work in cents, no float drift
		var totalCents = Math.round(((hours * 60 + minutes) * rate * 100) / 60);
		clearError();
		setTotal(totalCents);
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

	document.querySelectorAll('.copy').forEach(function (btn) {
		if (btn.dataset.copy === 'total') {
			btn.addEventListener('click', function () { copyText(els.total.value, btn); });
		} else if (btn.dataset.copy === 'words') {
			btn.addEventListener('click', function () { copyText(els.words.textContent, btn); });
		}
	});

	calculate();
})();