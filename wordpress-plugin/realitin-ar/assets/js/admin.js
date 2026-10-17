/* Product edit screen: choose a GLB file from the media library. */
( function ( $, settings ) {
	'use strict';

	$( function () {
		var $box = $( '.realitin-ar-admin' );
		if ( ! $box.length ) {
			return;
		}
		var $input = $box.find( '[data-realitin-ar-input]' );
		var $file = $box.find( '[data-realitin-ar-file]' );
		var $fileName = $box.find( '[data-realitin-ar-file-name]' );
		var $empty = $box.find( '[data-realitin-ar-empty]' );
		var $select = $box.find( '[data-realitin-ar-select]' );
		var $remove = $box.find( '[data-realitin-ar-remove]' );
		var frame;

		function show( attachment ) {
			$input.val( attachment ? attachment.id : '' );
			$fileName.text( attachment ? attachment.filename : '' );
			$file.prop( 'hidden', ! attachment );
			$empty.prop( 'hidden', !! attachment );
			$remove.prop( 'hidden', ! attachment );
			$select.text( attachment ? settings.change : settings.select );
		}

		$select.on( 'click', function () {
			if ( ! frame ) {
				frame = wp.media( {
					title: settings.title,
					button: { text: settings.button },
					library: { type: settings.mime },
					multiple: false,
				} );
				// The frame opens on "Upload files" while the library is still loading; show existing models first.
				frame.on( 'open', function () {
					frame.content.mode( 'browse' );
				} );
				frame.on( 'select', function () {
					show( frame.state().get( 'selection' ).first().toJSON() );
				} );
			}
			frame.open();
		} );

		$remove.on( 'click', function () {
			show( null );
		} );
	} );
} )( jQuery, window.realitinArAdmin );
