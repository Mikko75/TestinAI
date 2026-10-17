/* Product edit screen: choose a GLB file from the media library, or generate one from the product image. */
( function ( $, settings ) {
	'use strict';

	var POLL_MS = 3000;
	var TERMINAL = [ 'imported', 'failed' ];

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

		// The hidden input is what the product form saves, so it must always reflect the current model.
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

		// Generation from the product image.
		var $generate = $box.find( '[data-realitin-ar-generate]' );
		var $start = $generate.find( '[data-realitin-ar-generate-start]' );
		var $status = $generate.find( '[data-realitin-ar-generate-status]' );
		if ( ! $start.length ) {
			return;
		}
		var startLabel = $start.text();

		function statusText( job ) {
			var text = settings.status[ job.status ] || settings.status.queued;
			return text.replace( '%d', String( job.progress || 0 ) ).replace( '%%', '%' );
		}

		function render( job, errorMessage ) {
			$status.empty();
			var failed = job && job.status === 'failed';
			var $line = $( '<p>' ).text( errorMessage || statusText( job ) );
			if ( failed || errorMessage ) {
				$line.addClass( 'realitin-ar-generate__error' );
			}
			$status.append( $line );
			if ( failed && settings.errors[ job.error ] ) {
				$status.append( $( '<p>' ).text( settings.errors[ job.error ] ) );
			}
			if ( job && job.warnings && job.warnings.length ) {
				var $list = $( '<ul>' );
				job.warnings.forEach( function ( warning ) {
					$list.append( $( '<li>' ).text( warning ) );
				} );
				$status.append( $( '<p>' ).text( settings.warningsTitle ), $list );
			}
			var busy = job && TERMINAL.indexOf( job.status ) === -1 && ! errorMessage;
			$start.prop( 'disabled', busy );
			$start.text( job && ! busy ? settings.generateAgain : startLabel );
		}

		function request( action, data ) {
			return $.post(
				settings.ajaxUrl,
				$.extend( { action: action, nonce: settings.nonce, product_id: settings.productId }, data )
			);
		}

		function failMessage( xhr ) {
			var response = xhr && xhr.responseJSON;
			return response && response.data && response.data.message ? response.data.message : settings.requestFailed;
		}

		function poll() {
			request( 'realitin_ar_job_status' )
				.done( function ( response ) {
					var job = response.data;
					render( job );
					if ( job.status === 'imported' ) {
						show( { id: job.attachment_id, filename: job.file_name } );
						return;
					}
					if ( TERMINAL.indexOf( job.status ) === -1 ) {
						window.setTimeout( poll, POLL_MS );
					}
				} )
				.fail( function ( xhr ) {
					render( null, failMessage( xhr ) );
				} );
		}

		$start.on( 'click', function () {
			var data = {};
			$generate.find( '[data-realitin-ar-dimension]' ).each( function () {
				data[ $( this ).data( 'realitinArDimension' ) ] = $( this ).val();
			} );
			$start.prop( 'disabled', true );
			render( { status: 'queued', progress: 0 } );
			request( 'realitin_ar_generate', data )
				.done( function ( response ) {
					render( response.data );
					window.setTimeout( poll, POLL_MS );
				} )
				.fail( function ( xhr ) {
					render( null, failMessage( xhr ) );
				} );
		} );

		// Resume a generation that was still running when the page was loaded.
		if ( settings.job && TERMINAL.indexOf( settings.job.status ) === -1 ) {
			render( settings.job );
			poll();
		}
	} );
} )( jQuery, window.realitinArAdmin );
