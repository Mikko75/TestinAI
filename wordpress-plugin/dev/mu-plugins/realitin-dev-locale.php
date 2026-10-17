<?php
/**
 * Development only (not part of the plugin): set the locale with the cookie realitin_dev_locale=fi
 * to test translations without installing WordPress language packs.
 */

add_filter(
	'locale',
	static function ( $locale ) {
		// phpcs:ignore WordPress.Security.ValidatedSanitizedInput -- development helper.
		$requested = isset( $_COOKIE['realitin_dev_locale'] ) ? preg_replace( '/[^a-zA-Z_]/', '', $_COOKIE['realitin_dev_locale'] ) : '';
		return $requested ? $requested : $locale;
	}
);
