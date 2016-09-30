/*
 * analytics.js Google Analytics Plugin
 * Requires JQuery
 */

(($ => {

	$.extend(mejs.MepDefaults, {
		googleAnalyticsTitle: '',
		googleAnalyticsCategory: 'Videos',
		googleAnalyticsEventPlay: 'mejs.play',
		googleAnalyticsEventPause: 'mejs.pause',
		googleAnalyticsEventEnded: 'Ended',
		googleAnalyticsEventTime: 'Time'
	});


	$.extend(MediaElementPlayer.prototype, {
		builduniversalgoogleanalytics(player, controls, layers, media) {

			media.addEventListener('play', () => {
				if (typeof ga != 'undefined') {
					ga('send', 'event',
						player.options.googleAnalyticsCategory,
						player.options.googleAnalyticsEventPlay,
						(player.options.googleAnalyticsTitle === '') ? player.media.currentSrc : player.options.googleAnalyticsTitle
					);
				}
			}, false);

			media.addEventListener('pause', () => {
				if (typeof ga != 'undefined') {
					ga('send', 'event',
						player.options.googleAnalyticsCategory,
						player.options.googleAnalyticsEventPause,
						(player.options.googleAnalyticsTitle === '') ? player.media.currentSrc : player.options.googleAnalyticsTitle
					);
				}
			}, false);

			media.addEventListener('ended', () => {
				if (typeof ga != 'undefined') {
					ga('send', 'event',
						player.options.googleAnalyticsCategory,
						player.options.googleAnalyticsEventEnded,
						(player.options.googleAnalyticsTitle === '') ? player.media.currentSrc : player.options.googleAnalyticsTitle
					);
				}
			}, false);

			/*
			 media.addEventListener('timeupdate', function() {
			 if (typeof ga != 'undefined') {
			 ga('send', 'event',
			 player.options.googleAnalyticsCategory,
			 player.options.googleAnalyticsEventEnded,
			 player.options.googleAnalyticsTime,
			 (player.options.googleAnalyticsTitle === '') ? player.media.currentSrc : player.options.googleAnalyticsTitle,
			 player.currentTime
			 );
			 }
			 }, true);
			 */
		}
	});

}))(mejs.$);
