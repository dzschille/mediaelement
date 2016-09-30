/**
 * MediaElement utilities
 *
 * This file contains global functions and polyfills needed to support old browsers.
 *
 */
(((win, doc, mejs, undefined) => {

	/**
	 * @class {mejs.Utility}
	 * @class {mejs.Utils}
	 */
	mejs.Utility = mejs.Utils = {
		/**
		 * @type {Function[]}
		 */
		typeChecks: [],

		/**
		 *
		 * @param {Object} obj
		 * @param {String} name
		 * @param {Function} onGet
		 * @param {Function} onSet
		 */
		addProperty(obj, name, onGet, onSet) {
			// wrapper functions
			let oldValue = obj[name];

			const getFn = () => onGet.apply(obj, [oldValue]);
			const setFn = newValue => oldValue = onSet.apply(obj, [newValue]);

			// Modern browsers, IE9+ (IE8 only works on DOM objects, not normal JS objects)
			if (Object.defineProperty) {

				Object.defineProperty(obj, name, {
					get: getFn,
					set: setFn
				});

				// Older Firefox
			} else if (obj.__defineGetter__) {

				obj.__defineGetter__(name, getFn);
				obj.__defineSetter__(name, setFn);

				// IE6-7
				// must be a real DOM object (to have attachEvent) and must be attached to document (for onpropertychange to fire)
			} else {

				const onPropertyChange = event => {

					//console.log('onPropertyChange', event.propertyName);

					if (event.propertyName === name) {

						// temporarily remove the event so it doesn't fire again and create a loop
						obj.detachEvent('onpropertychange', onPropertyChange);

						// get the changed value, run it through the set function
						const newValue = setFn(obj[name]);

						// restore the get function
						obj[name] = getFn;
						obj[name].toString = () => getFn().toString();

						// restore the event
						obj.attachEvent('onpropertychange', onPropertyChange);
					}
				};

				try {
					obj[name] = getFn;
					obj[name].toString = () => getFn().toString();
				} catch (ex) {
					console.log('ERROR adding', name);
				}

				// add the property event change only once
				obj.attachEvent('onpropertychange', onPropertyChange);
			}
		},

		/**
		 *
		 * @param {String} eventName
		 * @param {HTMLElement} target
		 * @return {Object}
		 */
		createEvent(eventName, target) {
			let event = null;

			if (doc.createEvent) {
				event = doc.createEvent('Event');
				event.initEvent(eventName, true, false);
				event.target = target;
				//} else if (doc.createEventObject) {
				//	event = doc.createEventObject();
			} else {
				event = {};
			}
			event.type = eventName;
			event.target = target;

			return event;
		},

		/**
		 * Return the mime part of the type in case the attribute contains the codec
		 * (`video/mp4; codecs="avc1.42E01E, mp4a.40.2"` becomes `video/mp4`)
		 *
		 * @see http://www.whatwg.org/specs/web-apps/current-work/multipage/video.html#the-source-element
		 * @param {String} type
		 * @return {String}
		 */
		getMimeFromType(type) {
			if (type && ~type.indexOf(';')) {
				return type.substr(0, type.indexOf(';'));
			} else {
				return type;
			}
		},

		/**
		 * Get the format of a specific media, either based on URL or its mime type
		 *
		 * @param {String} url
		 * @param {String} type
		 * @return {String}
		 */
		formatType(url, type) {

			// if no type is supplied, fake it with the extension
			if (url && !type) {
				return this.getTypeFromFile(url);
			} else {
				return this.getMimeFromType(type);
			}
		},

		/**
		 * Get the type of media based on URL structure
		 *
		 * @param {String} url
		 * @return {String}
		 */
		getTypeFromFile(url) {
			let type = null;

			// do type checks first
			for (let i = 0, il = this.typeChecks.length; i < il; i++) {
				type = this.typeChecks[i](url);

				if (type !== null) {
					return type;
				}
			}

			// the do standard extension check
			const ext = this.getExtension(url);

			const normalizedExt = this.normalizeExtension(ext);

			type = `${/(mp4|m4v|ogg|ogv|webm|webmv|flv|wmv|mpeg|mov)/gi.test(ext) ? 'video' : 'audio'}/${normalizedExt}`;

			return type;
		},

		/**
		 * Get media file extension from URL
		 *
		 * @param {String} url
		 * @return {String}
		 */
		getExtension(url) {
			const withoutQuerystring = url.split('?')[0];
			const ext = ~withoutQuerystring.indexOf('.') ? withoutQuerystring.substring(withoutQuerystring.lastIndexOf('.') + 1) : '';

			return ext;
		},

		/**
		 * Get standard extension of a media file
		 *
		 * @param {String} extension
		 * @return {String}
		 */
		normalizeExtension(extension) {

			switch (extension) {
				case 'mp4':
				case 'm4v':
					return 'mp4';
				case 'webm':
				case 'webma':
				case 'webmv':
					return 'webm';
				case 'ogg':
				case 'oga':
				case 'ogv':
					return 'ogg';
				default:
					return extension;
			}
		},

		/**
		 *
		 * @param {String} url
		 * @return {String}
		 */
		encodeUrl(url) {
			return encodeURIComponent(url); //.replace(/\?/gi,'%3F').replace(/=/gi,'%3D').replace(/&/gi,'%26');
		},

		/**
		 *
		 * @param {String} output
		 * @return {string}
		 */
		escapeHTML(output) {
			return output.toString().split('&').join('&amp;').split('<').join('&lt;').split('"').join('&quot;');
		},

		/**
		 *
		 * @param {String} url
		 * @return {String}
		 */
		absolutizeUrl(url) {
			const el = doc.createElement('div');
			el.innerHTML = `<a href="${this.escapeHTML(url)}">x</a>`;
			return el.firstChild.href;
		},

		/**
		 * Format a numeric time in format '00:00:00'
		 *
		 * @param {number} time
		 * @param {Boolean} forceHours
		 * @param {Boolean} showFrameCount
		 * @param {number} fps - Frames per second
		 * @return {String}
		 */
		secondsToTimeCode(time, forceHours, showFrameCount, fps) {
			//add framecount
			if (typeof showFrameCount === 'undefined') {
				showFrameCount = false;
			} else if (typeof fps === 'undefined') {
				fps = 25;
			}

			const hours = Math.floor(time / 3600) % 24;
			const minutes = Math.floor(time / 60) % 60;
			const seconds = Math.floor(time % 60);
			const frames = Math.floor(((time % 1) * fps).toFixed(3));

			const result =
				`${( (forceHours || hours > 0) ? (hours < 10 ? '0' + hours : hours) + ':' : '')
				+ (minutes < 10 ? '0' + minutes : minutes)}:${seconds < 10 ? '0' + seconds : seconds}${(showFrameCount) ? ':' + (frames < 10 ? '0' + frames : frames) : ''}`;

			return result;
		},

		/**
		 * Convert a '00:00:00' tiem string into seconds
		 *
		 * @param {String} time
		 * @param {Boolean} forceHours
		 * @param {Boolean} showFrameCount
		 * @param {number} fps - Frames per second
		 * @return {number}
		 */
		timeCodeToSeconds(time, forceHours, showFrameCount, fps) {
			if (typeof showFrameCount === 'undefined') {
				showFrameCount = false;
			} else if (typeof fps === 'undefined') {
				fps = 25;
			}

			// 00:00:00		HH:MM:SS
			// 00:00 		MM:SS
			// 00			SS

			const parts = time.split(':');

			let hours = 0;
			let minutes = 0;
			let frames = 0;
			let seconds = 0;

			switch (parts.length) {
				default:
				case 1:
					seconds = parseInt(parts[0], 10);
					break;
				case 2:
					minutes = parseInt(parts[0], 10);
					seconds = parseInt(parts[1], 10);

					break;
				case 3:
				case 4:
					hours = parseInt(parts[0], 10);
					minutes = parseInt(parts[1], 10);
					seconds = parseInt(parts[2], 10);
					frames = showFrameCount ? parseInt(parts[3]) / fps : 0;
					break;

			}

			seconds = ( hours * 3600 ) + ( minutes * 60 ) + seconds + frames;

			return seconds;
		},

		/**
		 * Merge the contents of two or more objects together into the first object
		 *
		 * @return {Object}
		 */
		extend() {
			// borrowed from ender
			let options;

			let name;
			let src;
			let copy;
			let target = arguments[0] || {};
			let i = 1;
			const length = arguments.length;

			// Handle case when target is a string or something (possible in deep copy)
			if (typeof target !== "object" && typeof target !== "function") {
				target = {};
			}

			for (; i < length; i++) {
				// Only deal with non-null/undefined values
				if ((options = arguments[i]) != null) {
					// Extend the base object
					for (name in options) {
						src = target[name];
						copy = options[name];

						// Prevent never-ending loop
						if (target === copy) {
							continue;
						}

						if (copy !== undefined) {
							target[name] = copy;
						}
					}
				}
			}

			// Return the modified object
			return target;
		},

		/**
		 * Calculate the time format to use
		 *
		 * There is a default format set in the options but it can be incomplete, so it is adjusted according to the media
		 * duration. Format: 'hh:mm:ss:ff'
		 * @param {number} time
		 * @param {Object} options
		 * @param {number} fps - Frames per second
		 */
		calculateTimeFormat(time, options, fps) {
			if (time < 0) {
				time = 0;
			}

			if (typeof fps === 'undefined') {
				fps = 25;
			}

			let format = options.timeFormat;
			let firstChar = format[0];
			const firstTwoPlaces = (format[1] == format[0]);
			const separatorIndex = firstTwoPlaces ? 2 : 1;
			let separator = ':';
			const hours = Math.floor(time / 3600) % 24;
			const minutes = Math.floor(time / 60) % 60;
			const seconds = Math.floor(time % 60);
			const frames = Math.floor(((time % 1) * fps).toFixed(3));

			const lis = [
				[frames, 'f'],
				[seconds, 's'],
				[minutes, 'm'],
				[hours, 'h']
			];

			// Try to get the separator from the format
			if (format.length < separatorIndex) {
				separator = format[separatorIndex];
			}

			let required = false;

			for (let i = 0, len = lis.length; i < len; i++) {
				if (format.includes(lis[i][1])) {
					required = true;
				}
				else if (required) {
					let hasNextValue = false;
					for (let j = i; j < len; j++) {
						if (lis[j][0] > 0) {
							hasNextValue = true;
							break;
						}
					}

					if (!hasNextValue) {
						break;
					}

					if (!firstTwoPlaces) {
						format = firstChar + format;
					}
					format = lis[i][1] + separator + format;
					if (firstTwoPlaces) {
						format = lis[i][1] + format;
					}
					firstChar = lis[i][1];
				}
			}
			options.currentTimeFormat = format;
		},

		/**
		 * Convert Society of Motion Picture and Television Engineers (SMTPE) time code into seconds
		 *
		 * @param {String} SMPTE
		 * @return {number}
		 */
		convertSMPTEtoSeconds(SMPTE) {
			if (typeof SMPTE !== 'string')
				return false;

			SMPTE = SMPTE.replace(',', '.');

			let secs = 0;
			const decimalLen = (SMPTE.includes('.')) ? SMPTE.split('.')[1].length : 0;
			let multiplier = 1;

			SMPTE = SMPTE.split(':').reverse();

			for (let i = 0; i < SMPTE.length; i++) {
				multiplier = 1;
				if (i > 0) {
					multiplier = 60 ** i;
				}
				secs += Number(SMPTE[i]) * multiplier;
			}
			return Number(secs.toFixed(decimalLen));
		},
		// taken from underscore
		debounce(func, wait, immediate) {
			let timeout;
			return function () {
				const context = this;
				const args = arguments;
				const later = () => {
					timeout = null;
					if (!immediate) func.apply(context, args);
				};
				const callNow = immediate && !timeout;
				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
				if (callNow) func.apply(context, args);
			};
		}
	};

	/**
	 * @class {mejs.MediaFeatures}
	 * @class {mejs.Features}
	 */
	mejs.MediaFeatures = mejs.Features = ((() => {
		const features = {};
		const nav = win.navigator;
		const ua = nav.userAgent.toLowerCase();
		const html5Elements = ['source', 'track', 'audio', 'video'];
		let video = null;

		// for IE
		for (let i = 0, il = html5Elements.length; i < il; i++) {
			video = doc.createElement(html5Elements[i]);
		}

		features.isiPad = (ua.match(/ipad/i) !== null);
		features.isiPhone = (ua.match(/iphone/i) !== null);
		features.isiOS = features.isiPhone || features.isiPad;
		features.isAndroid = (ua.match(/android/i) !== null);
		features.isIE = (nav.appName.toLowerCase().includes("microsoft") || nav.appName.toLowerCase().match(/trident/gi) !== null);
		features.isChrome = (ua.match(/chrome/gi) !== null);
		features.isFirefox = (ua.match(/firefox/gi) !== null);

		/*
		 Possibly add back in when needed
		 features.isSafari = ua.match(/safari/gi) !== null && !features.isChrome;
		 features.isOpera = (ua.match(/opera/gi) !== null);
		 features.isBustedAndroid = (ua.match(/android 2\.[12]/) !== null);
		 features.isWebkit = (ua.match(/webkit/gi) !== null);
		 features.isGecko = (ua.match(/gecko/gi) !== null) && !features.isWebkit;

		 */

		// borrowed from Modernizr
		features.hasTouch = ('ontouchstart' in win);
		features.svg = !!doc.createElementNS && !!doc.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGRect;

		features.supportsPointerEvents = ((() => {
			const element = doc.createElement('x');
			const documentElement = doc.documentElement;
			const getComputedStyle = win.getComputedStyle;
			let supports;

			if (!('pointerEvents' in element.style)) {
				return false;
			}

			element.style.pointerEvents = 'auto';
			element.style.pointerEvents = 'x';
			documentElement.appendChild(element);
			supports = getComputedStyle && getComputedStyle(element, '').pointerEvents === 'auto';
			documentElement.removeChild(element);
			return !!supports;
		}))();


		// Older versions of Firefox can't move plugins around without it resetting,
		features.hasFirefoxPluginMovingProblem = false;

		// Detect native JavaScript fullscreen (Safari/Firefox only, Chrome still fails)

		// iOS
		features.hasiOSFullScreen = (typeof video.webkitEnterFullscreen !== 'undefined');

		// W3C
		features.hasNativeFullscreen = (typeof video.requestFullscreen !== 'undefined');

		// webkit/firefox/IE11+
		features.hasWebkitNativeFullScreen = (typeof video.webkitRequestFullScreen !== 'undefined');
		features.hasMozNativeFullScreen = (typeof video.mozRequestFullScreen !== 'undefined');
		features.hasMsNativeFullScreen = (typeof video.msRequestFullscreen !== 'undefined');

		features.hasTrueNativeFullScreen =
			(features.hasWebkitNativeFullScreen || features.hasMozNativeFullScreen || features.hasMsNativeFullScreen);
		features.nativeFullScreenEnabled = features.hasTrueNativeFullScreen;

		// Enabled?
		if (features.hasMozNativeFullScreen) {
			features.nativeFullScreenEnabled = doc.mozFullScreenEnabled;
		} else if (features.hasMsNativeFullScreen) {
			features.nativeFullScreenEnabled = doc.msFullscreenEnabled;
		}

		if (features.isChrome) {
			features.hasiOSFullScreen = false;
		}

		if (features.hasTrueNativeFullScreen) {

			features.fullScreenEventName = '';
			if (features.hasWebkitNativeFullScreen) {
				features.fullScreenEventName = 'webkitfullscreenchange';

			} else if (features.hasMozNativeFullScreen) {
				features.fullScreenEventName = 'mozfullscreenchange';

			} else if (features.hasMsNativeFullScreen) {
				features.fullScreenEventName = 'MSFullscreenChange';
			}

			features.isFullScreen = () => {
				if (features.hasMozNativeFullScreen) {
					return doc.mozFullScreen;

				} else if (features.hasWebkitNativeFullScreen) {
					return doc.webkitIsFullScreen;

				} else if (features.hasMsNativeFullScreen) {
					return doc.msFullscreenElement !== null;
				}
			};

			features.requestFullScreen = el => {

				if (features.hasWebkitNativeFullScreen) {
					el.webkitRequestFullScreen();
				} else if (features.hasMozNativeFullScreen) {
					el.mozRequestFullScreen();
				} else if (features.hasMsNativeFullScreen) {
					el.msRequestFullscreen();
				}
			};

			features.cancelFullScreen = () => {
				if (features.hasWebkitNativeFullScreen) {
					doc.webkitCancelFullScreen();

				} else if (features.hasMozNativeFullScreen) {
					doc.mozCancelFullScreen();

				} else if (features.hasMsNativeFullScreen) {
					doc.msExitFullscreen();

				}
			};
		}

		// OS X 10.5 can't do this even if it says it can :(
		if (features.hasiOSFullScreen && ua.match(/mac os x 10_5/i)) {
			features.hasNativeFullScreen = false;
			features.hasiOSFullScreen = false;
		}

		// Test if Media Source Extensions are supported by browser
		features.hasMse = ('MediaSource' in win);

		features.supportsMediaTag = (typeof video.canPlayType !== 'undefined' || features.hasMse);

		return features;
	}))();

}))(window, document, window.mejs || {});