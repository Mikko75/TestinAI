/*
 * Realitin AR – product page dialog with a 3D model and an AR button.
 * model-viewer is imported only when the dialog is first opened.
 */
( function () {
	'use strict';

	var settings = window.realitinAr;
	if ( ! settings ) {
		return;
	}
	var messages = settings.messages;
	var modelViewerLoader = null;

	function loadModelViewer() {
		if ( ! modelViewerLoader ) {
			modelViewerLoader = import( settings.modelViewerUrl ).catch( function ( error ) {
				modelViewerLoader = null;
				throw error;
			} );
		}
		return modelViewerLoader;
	}

	function setup( root ) {
		var dialog = root.querySelector( 'dialog' );
		var stage = root.querySelector( '[data-realitin-ar-stage]' );
		var loading = root.querySelector( '[data-realitin-ar-loading]' );
		var progress = root.querySelector( '[data-realitin-ar-progress]' );
		var error = root.querySelector( '[data-realitin-ar-error]' );
		var start = root.querySelector( '[data-realitin-ar-start]' );
		var help = root.querySelector( '[data-realitin-ar-help]' );
		var viewer = null;
		var attempt = 0;

		function setHelp( key ) {
			help.textContent = messages[ key ];
			start.disabled = key !== 'available';
		}

		function showLoading() {
			loading.hidden = false;
			error.hidden = true;
			progress.style.width = '0%';
			setHelp( 'checking' );
		}

		function showError() {
			loading.hidden = true;
			error.hidden = false;
			setHelp( 'modelError' );
		}

		function reportAvailability() {
			// model-viewer chooses the AR mode (webxr / scene-viewer / quick-look) the device supports.
			setHelp( viewer.canActivateAR ? 'available' : 'unavailable' );
		}

		function createViewer() {
			viewer = document.createElement( 'model-viewer' );
			var attributes = {
				src: root.dataset.src,
				alt: root.dataset.alt,
				ar: '',
				'ar-modes': 'webxr scene-viewer quick-look',
				'ar-placement': 'floor',
				'ar-scale': 'fixed',
				'camera-controls': '',
				'touch-action': 'pan-y',
				'interaction-prompt': 'none',
				'shadow-intensity': '1',
				loading: 'eager',
			};
			Object.keys( attributes ).forEach( function ( name ) {
				viewer.setAttribute( name, attributes[ name ] );
			} );
			viewer.className = 'realitin-ar__viewer';
			// Replace model-viewer's own progress bar; the overlay shows loading instead.
			var progressSlot = document.createElement( 'div' );
			progressSlot.slot = 'progress-bar';
			viewer.appendChild( progressSlot );

			viewer.addEventListener( 'progress', function ( event ) {
				progress.style.width = Math.round( event.detail.totalProgress * 100 ) + '%';
			} );
			viewer.addEventListener( 'load', function () {
				loading.hidden = true;
				reportAvailability();
			} );
			viewer.addEventListener( 'error', function ( event ) {
				if ( event.detail && event.detail.type === 'loadfailure' ) {
					showError();
				}
			} );
			viewer.addEventListener( 'ar-status', function ( event ) {
				if ( event.detail.status === 'failed' ) {
					help.textContent = messages.failed;
					start.disabled = ! viewer.canActivateAR;
				}
			} );
			stage.insertBefore( viewer, stage.firstChild );
		}

		root.querySelector( '[data-realitin-ar-open]' ).addEventListener( 'click', function () {
			dialog.showModal();
			if ( viewer ) {
				return;
			}
			showLoading();
			loadModelViewer().then( createViewer, showError );
		} );

		root.querySelector( '[data-realitin-ar-close]' ).addEventListener( 'click', function () {
			dialog.close();
		} );
		// Close when the backdrop outside the dialog box is clicked.
		dialog.addEventListener( 'click', function ( event ) {
			if ( event.target === dialog ) {
				dialog.close();
			}
		} );

		root.querySelector( '[data-realitin-ar-retry]' ).addEventListener( 'click', function () {
			showLoading();
			if ( ! viewer ) {
				loadModelViewer().then( createViewer, showError );
				return;
			}
			// model-viewer caches failed loads by URL, so a retry needs a different URL.
			attempt += 1;
			var url = new URL( root.dataset.src, window.location.href );
			url.searchParams.set( 'realitin_ar_retry', String( attempt ) );
			viewer.src = url.toString();
		} );

		start.addEventListener( 'click', function () {
			setHelp( 'available' );
			// Must be called directly from the tap: Quick Look and Scene Viewer require a user gesture.
			viewer.activateAR().catch( function () {
				help.textContent = messages.failed;
			} );
		} );
	}

	document.querySelectorAll( '[data-realitin-ar]' ).forEach( setup );
} )();
